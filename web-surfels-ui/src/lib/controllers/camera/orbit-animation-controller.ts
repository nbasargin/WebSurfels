import { vec3 } from 'gl-matrix';
import { Camera } from '../../renderer/camera';

export class OrbitAnimationController {

    private time: number = 0;

    constructor(
        public camera: Camera,
        public minDistance: number,
        public maxDistance: number,
        public cameraElevation: number,
        public targetElevation: number,
        public rotationDuration: number
    ) {
    }

    animate(msPassed: number) {
        this.time += msPassed;

        // target = (0, 0, 0) + up * targetElevation
        // camera moves through the plane with normal = up, going through point = target + up * cameraElevation
        const up = this.camera.up;
        const targetCenter = vec3.clone(up);
        vec3.scale(targetCenter, targetCenter, this.targetElevation);
        const camOrbitCenter = vec3.clone(up);
        vec3.scale(camOrbitCenter, camOrbitCenter, this.cameraElevation);

        const frontReference = this.camera.isZAxisUp() ? vec3.fromValues(0, 1, 0) : vec3.fromValues(0, 0, 1);
        const right = vec3.cross(vec3.create(), frontReference, up);
        const front = vec3.cross(vec3.create(), up, right);

        const phase = (this.time / this.rotationDuration) * Math.PI * 2;
        const currentDist = this.minDistance + (this.maxDistance - this.minDistance) * (Math.cos(phase / 3) + 1) / 2;

        const eye = camOrbitCenter;
        vec3.scaleAndAdd(eye, eye, front, Math.sin(phase) * currentDist);
        vec3.scaleAndAdd(eye, eye, right, Math.cos(phase) * currentDist);

        // look at origin from current position
        this.camera.setOrientation(eye, targetCenter, up);
    }

}
