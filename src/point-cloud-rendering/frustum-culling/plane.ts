import { vec3 } from 'gl-matrix';

export interface Plane {
    normal: vec3;
    point: vec3;
}
