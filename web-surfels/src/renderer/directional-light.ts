import { vec3 } from 'gl-matrix';

export class DirectionalLight {

    enabled: boolean = true;
    headlight: boolean = true;
    direction: vec3 = vec3.fromValues(0, 0, 1);

    ambientIntensity: number = 0.3;
    specularIntensity: number = 0.2;
    specularShininess: number = 32;

}
