import { vec3 } from 'gl-matrix';
import { Camera } from '../../renderer/camera';
import { DirectionalLight } from '../../renderer/directional-light';

export class HeadlightController {

    enabled: boolean = true;

    constructor(public light: DirectionalLight, public camera: Camera) {
    }

    update() {
        if (this.enabled) {
            vec3.copy(this.light.direction, this.camera.viewDirection);
            vec3.negate(this.light.direction, this.light.direction);
        }
    }

}
