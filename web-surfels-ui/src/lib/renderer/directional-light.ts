import { vec3 } from 'gl-matrix';

export class DirectionalLight {

    enabled: boolean;
    direction: vec3;

    ambientIntensity: number = 0.3;
    specularIntensity: number = 0.2;
    specularShininess: number = 32;

}
