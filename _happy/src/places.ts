// Les sorties : de courtes scènes-souvenirs. On ne contrôle rien, on regarde le moment exister.
import * as THREE from "three";
import { PAL, ball, capsule, cyl, group, mat, rbox } from "./kit";

type V = THREE.Object3D;
const tree = (x: number, z: number, h = 1, c = 0x9db592) => group(x, 0, z, cyl(0.09, 0.12, 0.9 * h, mat(PAL.caramel), 0, 0.45 * h, 0), ball(0.55 * h, mat(c), 0, 1.15 * h, 0), ball(0.4 * h, mat(c), 0.3 * h, 0.95 * h, 0.15), ball(0.36 * h, mat(c), -0.28 * h, 1.0 * h, -0.1));
const stool = (x: number, z: number, c: number = PAL.rose) => group(x, 0, z, cyl(0.22, 0.22, 0.07, mat(c), 0, 0.42, 0), cyl(0.03, 0.03, 0.4, mat(PAL.ink), 0, 0.2, 0), cyl(0.15, 0.17, 0.03, mat(PAL.ink), 0, 0.015, 0));
const table = (x: number, z: number, r = 0.5, c: number = PAL.cream) => group(x, 0, z, cyl(r, r, 0.06, mat(c), 0, 0.72, 0), cyl(0.05, 0.05, 0.7, mat(PAL.ink), 0, 0.35, 0), cyl(0.24, 0.27, 0.04, mat(PAL.ink), 0, 0.02, 0));
const cup = (x: number, z: number, y = 0.75) => group(x, y, z, cyl(0.055, 0.045, 0.09, mat(PAL.white), 0, 0.045, 0), cyl(0.09, 0.07, 0.015, mat(PAL.white), 0, 0.005, 0));
const plate = (x: number, z: number, c: number) => group(x, 0.755, z, cyl(0.15, 0.11, 0.02, mat(PAL.white), 0, 0.01, 0), ball(0.07, mat(c), 0, 0.04, 0));
const armchair = (x: number, z: number, ry: number, c: number) => {
  const m = mat(c);
  const g = group(x, 0, z, rbox(0.86, 0.3, 0.8, 0.12, m, 0, 0.27, 0), rbox(0.86, 0.62, 0.22, 0.1, m, 0, 0.62, -0.34), rbox(0.18, 0.4, 0.74, 0.08, m, -0.4, 0.44, 0.02), rbox(0.18, 0.4, 0.74, 0.08, m, 0.4, 0.44, 0.02));
  g.rotation.y = ry;
  return g;
};
const disc = (rt: number, rb: number, h: number, c: number, y: number) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 72), mat(c)); m.position.y = y; m.receiveShadow = true; return m; };
const ground = (c: number, rim: number) => [disc(3.3, 3.3, 0.3, c, -0.15), disc(3.5, 3.6, 0.4, rim, -0.42)];

export interface Seat { x: number; z: number; face: number; y: number }
export interface Stage { props: V[]; hero: Seat; other?: Seat; start: [number, number]; steam?: [number, number, number]; walkTo?: [number, number]; otherStart?: [number, number] }

/** Construit le décor d'une sortie et dit où chacun s'installe. */
export function buildOuting(id: string): Stage {
  const S: Record<string, () => Stage> = {
    park: () => ({
      props: [...ground(0xb9c7ab, 0xa8b89a), rbox(6.4, 0.02, 0.9, 0.01, mat(0xf0dcc4), 0, 0.012, 1.3, { cast: false }), tree(-1.8, -1.2, 1.25), tree(1.9, -1.5, 1.05, 0xa8b89a), tree(0.2, -2.2, 0.9, 0xc4cf9f), tree(-2.4, 0.4, 0.7, 0xa8b89a),
        group(0.3, 0, -0.3, rbox(1.5, 0.08, 0.44, 0.03, mat(PAL.caramel), 0, 0.42, 0), rbox(1.5, 0.4, 0.07, 0.03, mat(PAL.caramel), 0, 0.72, -0.2), rbox(0.07, 0.42, 0.4, 0.03, mat(PAL.ink), -0.62, 0.21, 0), rbox(0.07, 0.42, 0.4, 0.03, mat(PAL.ink), 0.62, 0.21, 0)),
        ball(0.22, mat(PAL.rose), 2.3, 0.14, 0.6), ball(0.16, mat(PAL.mustard), 2.0, 0.1, 0.9), ball(0.18, mat(PAL.rose), -1.2, 0.1, 2.2)],
      hero: { x: 0.0, z: -0.28, face: 0, y: 0.06 }, other: { x: 0.62, z: -0.28, face: 0, y: 0.06 }, start: [-2.9, 1.3], otherStart: [-2.9, 1.9],
    }),
    cafe: () => ({
      props: [...ground(0xf6e3d2, 0xe9cdb6), table(0, 0), stool(-0.75, 0), stool(0.75, 0, PAL.sky), cup(-0.22, 0.05), cup(0.24, -0.05),
        group(-0.9, 0, -1.5, cyl(0.035, 0.035, 2.9, mat(PAL.ink), 0, 1.45, 0), cyl(0.05, 1.25, 0.42, mat(PAL.mustard), 0, 2.95, 0), cyl(0.2, 0.24, 0.06, mat(PAL.ink), 0, 0.03, 0)),
        group(-2.2, 0, -1.4, cyl(0.28, 0.22, 0.4, mat(PAL.rose), 0, 0.2, 0), ball(0.4, mat(0x9db592), 0, 0.7, 0)), rbox(1.6, 1.9, 0.14, 0.06, mat(PAL.sky), 1.4, 0.95, -2.3), rbox(0.6, 0.5, 0.04, 0.02, mat(PAL.cream), 1.4, 1.2, -2.21)],
      hero: { x: -0.75, z: 0, face: Math.PI / 2, y: 0.02 }, other: { x: 0.75, z: 0, face: -Math.PI / 2, y: 0.02 }, start: [-2.8, 1.6], otherStart: [2.6, 1.8], steam: [-0.22, 0.95, 0.05],
    }),
    resto: () => ({
      props: [...ground(0xe9c9bd, 0xd9b0a6), table(0, 0, 0.62, PAL.white), stool(-0.85, 0, PAL.caramel), stool(0.85, 0, PAL.caramel), plate(-0.28, 0, PAL.mustard), cup(0.05, 0.25),
        group(0.12, 0.75, -0.2, cyl(0.03, 0.03, 0.16, mat(PAL.cream), 0, 0.08, 0), ball(0.035, mat(0xffe0a0, { emissive: 0xffb050, emissiveIntensity: 1.6 }), 0, 0.19, 0, { cast: false })),
        group(0, 0, 0, cyl(0.012, 0.012, 1.4, mat(PAL.ink), 0, 3.0, 0), cyl(0.12, 0.42, 0.3, mat(PAL.mustard), 0, 2.25, 0)), rbox(2.2, 1.5, 0.12, 0.05, mat(PAL.caramel), -0.6, 0.75, -2.5), tree(2.3, -1.2, 0.55)],
      hero: { x: -0.85, z: 0, face: Math.PI / 2, y: 0.02 }, start: [-2.8, 1.6], steam: [-0.28, 0.9, 0],
    }),
    lou: () => ({
      props: [...ground(0xf3dcc6, 0xe2c4a8), table(0, 0, 0.66, PAL.sage), stool(-0.9, 0, PAL.caramel), stool(0.9, 0, PAL.caramel), plate(-0.3, 0.05, PAL.rose), plate(0.3, -0.05, PAL.rose),
        group(0, 0.755, 0, cyl(0.17, 0.15, 0.16, mat(PAL.mustard), 0, 0.08, 0), cyl(0.18, 0.18, 0.02, mat(PAL.caramel), 0, 0.17, 0), ball(0.03, mat(PAL.ink), 0, 0.2, 0)),
        group(-1.2, 0, -2.3, rbox(1.6, 0.9, 0.6, 0.06, mat(PAL.cream), 0, 0.45, 0), rbox(1.66, 0.06, 0.66, 0.03, mat(PAL.caramel), 0, 0.93, 0), cyl(0.1, 0.08, 0.2, mat(PAL.rose), 0.4, 1.06, 0), ball(0.14, mat(0xe7b4b1), 0.4, 1.26, 0)),
        group(1.7, 0, -2.0, rbox(0.9, 1.5, 0.08, 0.03, mat(PAL.white), 0, 1.5, 0), rbox(0.8, 1.4, 0.04, 0.01, mat(PAL.sky), 0, 1.5, 0.03, { cast: false })), ball(0.2, mat(0xfffaf2), 2.2, 0.16, 1.2), ball(0.11, mat(0xfffaf2), 2.36, 0.3, 1.28)],
      hero: { x: -0.9, z: 0, face: Math.PI / 2, y: 0.02 }, other: { x: 0.9, z: 0, face: -Math.PI / 2, y: 0.14 }, start: [-2.8, 1.6], steam: [0, 1.0, 0],
    }),
    rdv: () => ({
      props: [...ground(0xdfe8dc, 0xc9d6c4), disc(1.9, 1.9, 0.03, PAL.cream, 0.015), armchair(-0.95, 0.1, Math.PI / 2 - 0.25, PAL.mustard), armchair(0.95, 0.1, -Math.PI / 2 + 0.25, PAL.sage),
        group(0, 0, -0.75, cyl(0.3, 0.3, 0.04, mat(PAL.caramel), 0, 0.44, 0), cyl(0.03, 0.03, 0.44, mat(PAL.caramel), 0, 0.22, 0), rbox(0.2, 0.1, 0.12, 0.02, mat(PAL.white), -0.05, 0.51, 0), cup(0.14, 0.05, 0.46)),
        group(1.9, 0, -1.6, cyl(0.24, 0.19, 0.36, mat(PAL.rose), 0, 0.18, 0), ball(0.36, mat(0x9db592), 0, 0.7, 0), ball(0.26, mat(0x9db592), 0.2, 1.0, 0.05)),
        group(-1.9, 0, -1.5, cyl(0.17, 0.19, 0.04, mat(PAL.ink), 0, 0.02, 0), cyl(0.02, 0.02, 1.5, mat(PAL.ink), 0, 0.77, 0), cyl(0.15, 0.24, 0.3, mat(PAL.cream), 0, 1.6, 0), ball(0.07, mat(0xfff0cf, { emissive: 0xffc070, emissiveIntensity: 1.4 }), 0, 1.5, 0, { cast: false }))],
      hero: { x: -0.9, z: 0.12, face: Math.PI / 2 - 0.25, y: 0.1 }, other: { x: 0.9, z: 0.12, face: -Math.PI / 2 + 0.25, y: 0.1 }, start: [-2.6, 1.8],
    }),
    market: () => {
      const stall = (x: number, z: number, c: number, cols: number[]) => {
        const g = group(x, 0, z, rbox(1.5, 0.08, 0.7, 0.03, mat(PAL.caramel), 0, 0.7, 0), rbox(1.6, 0.06, 0.9, 0.03, mat(c), 0, 1.75, 0.05));
        for (const sx of [-0.68, 0.68]) g.add(cyl(0.03, 0.03, 1.75, mat(PAL.ink), sx, 0.87, -0.3), cyl(0.03, 0.03, 0.7, mat(PAL.ink), sx, 0.35, 0.3));
        cols.forEach((col, i) => g.add(i % 2 ? ball(0.09, mat(col), -0.5 + i * 0.25, 0.83, 0) : rbox(0.16, 0.2, 0.14, 0.03, mat(col), -0.5 + i * 0.25, 0.84, 0.05)));
        return g;
      };
      return {
        props: [...ground(0xf0dcc4, 0xe0c4a6), stall(-1.0, -1.0, PAL.rose, [PAL.sky, PAL.mustard, PAL.sage, PAL.rose, PAL.cream]), stall(1.3, -0.6, PAL.sage, [PAL.mustard, PAL.rose, PAL.sky, PAL.white, PAL.caramel]), tree(-2.5, -1.9, 0.8), tree(2.6, 1.2, 0.6, 0xc4cf9f)],
        hero: { x: 1.3, z: 0.25, face: Math.PI, y: 0 }, start: [-2.9, 1.5], walkTo: [-1.0, -0.15],
      };
    },
  };
  S.walk = S.park; S.friend = S.cafe;
  return S[id]();
}

/** Parapluie tenu à la main, les jours de pluie. */
export function umbrella(): THREE.Group {
  return group(0.05, 0, 0.05, cyl(0.012, 0.012, 0.95, mat(PAL.ink), 0, 0.42, 0), cyl(0.03, 0.62, 0.26, mat(PAL.rose), 0, 0.98, 0), capsule(0.02, 0.01, mat(PAL.ink), 0, 1.13, 0));
}
