"""Met à jour les fiches projet du site depuis itch.io.

Pour chaque projet de js/data.js qui a une url itch.io, récupère la page et
produit data/projects/<id>.json (description, infos, fichiers…) et les images
dans assets/projects/<id>/.

usage (depuis la racine du site) :
    pip install beautifulsoup4 pillow
    python3 tools/import_itch.py            # tous les projets
    python3 tools/import_itch.py chaaat     # un seul projet
"""
import io, json, os, re, subprocess, sys, hashlib
from urllib.parse import urlparse
from bs4 import BeautifulSoup, NavigableString, Comment
from PIL import Image

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read_sources():
    """Lit les couples id → url itch.io dans js/data.js."""
    src = open(os.path.join(SITE, "js", "data.js"), encoding="utf-8").read()
    src = src[src.index("window.PROJECTS"):]
    out = {}
    for block in re.findall(r"\{(.*?)\n  \}", src, re.S):
        i = re.search(r'\bid:\s*"([^"]+)"', block)
        u = re.search(r'\burl:\s*"(https://[^"]+\.itch\.io/[^"]+)"', block)
        if i and u:
            out[i.group(1)] = u.group(1)
    return out


SOURCES = read_sources()

ALLOWED = {"p", "br", "strong", "b", "em", "i", "u", "s", "strike", "h1", "h2", "h3", "h4", "h5", "h6",
           "ul", "ol", "li", "a", "img", "blockquote", "hr", "code", "pre", "table", "thead", "tbody",
           "tr", "td", "th", "sub", "sup"}
DROP = {"script", "style", "form", "input", "button", "object", "embed", "noscript", "svg", "select", "textarea"}
ATTRS = {"a": {"href"}, "img": {"src", "alt"}, "td": {"colspan", "rowspan"}, "th": {"colspan", "rowspan"}}
YT = re.compile(r"(?:youtube(?:-nocookie)?\.com/embed/|youtu\.be/|youtube\.com/watch\?v=)([\w-]{6,20})")


def fetch(url):
    return subprocess.run(["curl", "-sS", "-m", "60", "-L", url], capture_output=True, check=True).stdout


def save_image(url, folder, name, max_w=1600):
    """Télécharge une image, la redimensionne et l'enregistre (webp, ou gif si animé)."""
    if url.startswith("//"):
        url = "https:" + url
    host = urlparse(url).hostname or ""
    if not (host == "img.itch.zone" or host.endswith(".itch.zone") or host.endswith("itch.io")):
        return None  # on ne récupère que les images hébergées par itch
    data = fetch(url)
    im = Image.open(io.BytesIO(data))
    os.makedirs(folder, exist_ok=True)
    if getattr(im, "is_animated", False):
        path = os.path.join(folder, name + ".gif")
        if len(data) > 6_000_000:  # GIF trop lourd : on garde la 1re image
            im.seek(0)
            im = im.convert("RGBA")
            path = os.path.join(folder, name + ".webp")
            im.thumbnail((max_w, max_w * 4))
            im.save(path, "WEBP", quality=82, method=6)
        else:
            with open(path, "wb") as f:
                f.write(data)
        w, h = Image.open(path).size
    else:
        im = im.convert("RGBA") if im.mode in ("P", "LA", "RGBA") else im.convert("RGB")
        if im.width > max_w:
            im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
        path = os.path.join(folder, name + ".webp")
        im.save(path, "WEBP", quality=82, method=6)
        w, h = im.size
    return {"src": os.path.relpath(path, SITE).replace(os.sep, "/"), "w": w, "h": h}


def sanitize(node, pid, folder, counter):
    """Nettoie le HTML de la description (en place)."""
    for c in node.find_all(string=lambda t: isinstance(t, Comment)):
        c.extract()
    for tag in list(node.find_all(True)):
        if tag.parent is None:
            continue
        name = tag.name
        if name in DROP:
            tag.decompose()
            continue
        if name == "iframe":
            m = YT.search(tag.get("src", ""))
            if m:
                div = BeautifulSoup('<div class="video" data-yt="%s"></div>' % m.group(1), "html.parser").div
                tag.replace_with(div)
            else:
                tag.decompose()
            continue
        if name not in ALLOWED:
            tag.unwrap()
            continue
        keep = ATTRS.get(name, set())
        for a in list(tag.attrs):
            if a not in keep:
                del tag[a]
        if name == "a":
            href = tag.get("href", "")
            if not re.match(r"^(https?:|mailto:)", href):
                if href.startswith("//"):
                    tag["href"] = "https:" + href
                else:
                    tag.unwrap()
                    continue
            tag["target"] = "_blank"
            tag["rel"] = "noopener"
        if name == "img":
            src = tag.get("src", "")
            counter[0] += 1
            try:
                img = save_image(src, folder, "desc-%d" % counter[0], max_w=1200)
            except Exception as e:  # image inaccessible
                print("   ! image description ignorée:", src, e)
                img = None
            if not img:
                tag.decompose()
                continue
            tag["src"] = img["src"]
            tag["loading"] = "lazy"
            tag["width"], tag["height"] = str(img["w"]), str(img["h"])
            if not tag.get("alt"):
                tag["alt"] = ""
    # paragraphes vides
    for p in node.find_all("p"):
        if not p.get_text(strip=True) and not p.find(["img", "div"]):
            p.decompose()
    html = "".join(str(c) for c in node.contents).strip()
    html = re.sub(r"(\s*<br/?>\s*){3,}", "<br/><br/>", html)
    return html


def text(el):
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True)).replace(" ,", ",").strip()


def extract(pid):
    soup = BeautifulSoup(fetch(SOURCES[pid]).decode("utf-8", "replace"), "html.parser")
    folder = os.path.join(SITE, "assets", "projects", pid)
    out = {"id": pid, "source": SOURCES[pid]}

    # description
    desc = soup.select_one("div.formatted_description")
    counter = [0]
    out["description"] = sanitize(desc, pid, folder, counter) if desc else ""

    # captures d'écran
    shots = []
    links = [a.get("href", "") for a in soup.select("div.screenshot_list a[data-image_lightbox]")]
    # « aW1nLz » = base64 de « img/ » : c'est la jaquette (déjà affichée), pas une capture.
    links = [u for u in links if "/aW1nLz" not in u]
    for i, href in enumerate(links, 1):
        try:
            img = save_image(href, folder, "shot-%d" % i)
            if img:
                shots.append(img)
        except Exception as e:
            print("   ! capture ignorée:", e)
    out["screenshots"] = shots

    # vidéos (bloc vidéo d'itch, hors description)
    vids = []
    for f in soup.select("div.video_embed iframe, div.embed_wrapper iframe"):
        m = YT.search(f.get("src", ""))
        if m and m.group(1) not in vids:
            vids.append(m.group(1))
    out["videos"] = vids

    # tableau d'infos
    info = {}
    for tr in soup.select("div.game_info_panel_widget table tr"):
        tds = tr.find_all("td")
        if len(tds) == 2:
            key = text(tds[0])
            abbr = tds[1].find("abbr")
            val = abbr.get("title", "").split("@")[0].strip() if abbr and abbr.get("title") else text(tds[1])
            info[key] = val
    out["info"] = info

    # fichiers téléchargeables
    uploads = []
    for up in soup.select("div.upload_list_widget div.upload"):
        name_el = up.select_one(".upload_name .name") or up.select_one(".upload_name")
        size_el = up.select_one(".file_size")
        plats = [s.get("title", "").replace("Download for ", "") for s in up.select(".download_platforms [title]")]
        if name_el:
            uploads.append({
                "name": (name_el.get("title") or text(name_el)).strip(),
                "size": text(size_el) if size_el else "",
                "platforms": [p for p in plats if p],
            })
    out["uploads"] = uploads
    out["download"] = bool(soup.select_one("#download")) and bool(uploads)
    return out


os.makedirs(os.path.join(SITE, "data", "projects"), exist_ok=True)
wanted = sys.argv[1:] or list(SOURCES)
for pid in wanted:
    if pid not in SOURCES:
        print("projet inconnu ou sans url itch.io :", pid)
        continue
    d = extract(pid)
    with open(os.path.join(SITE, "data", "projects", pid + ".json"), "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
    print("%-18s desc=%5d car. | %d captures | %d vidéos | %d fichiers | infos: %s" % (
        pid, len(d["description"]), len(d["screenshots"]), len(d["videos"]), len(d["uploads"]), ", ".join(d["info"].keys())))
