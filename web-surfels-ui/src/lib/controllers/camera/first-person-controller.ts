import { mat4, vec3 } from 'gl-matrix';
import { Camera } from '../../renderer/camera';

export class FirstPersonController {


    constructor(private camera: Camera) {
    }

    moveForward(distance: number) {
        vec3.scaleAndAdd(this.camera.eye, this.camera.eye, this.camera.viewDirection, distance);
        vec3.scaleAndAdd(this.camera.target, this.camera.target, this.camera.viewDirection, distance);
        this.camera.setOrientation(this.camera.eye, this.camera.target, this.camera.up);
    }

    moveRight(distance: number) {
        const right = vec3.cross(vec3.create(), this.camera.viewDirection, this.camera.up);
        vec3.scaleAndAdd(this.camera.eye, this.camera.eye, right, distance);
        vec3.scaleAndAdd(this.camera.target, this.camera.target, right, distance);
        this.camera.setOrientation(this.camera.eye, this.camera.target, this.camera.up);
    }

    addPitch(pitchDelta: number) {
        // current pitch: 90° - angle between top and view-direction
        const currentPitch = 90 - vec3.angle(this.camera.up, this.camera.viewDirection) / Math.PI * 180;
        const newPitch = Math.min(89.99, Math.max(-89.99, currentPitch + pitchDelta));
        const right = vec3.cross(vec3.create(), this.camera.viewDirection, this.camera.up);
        const rotation = mat4.create();
        mat4.rotate(rotation, rotation, -(90 - newPitch) / 180 * Math.PI, right);
        const newViewDirection = vec3.clone(this.camera.up);
        vec3.transformMat4(newViewDirection, newViewDirection, rotation);
        this.camera.setViewDirection(newViewDirection);
    }

    addYaw(yaw: number) {
        const rotation = mat4.create();
        mat4.rotate(rotation, rotation, yaw / 180 * Math.PI, this.camera.up);
        const newViewDirection = vec3.clone(this.camera.viewDirection);
        vec3.transformMat4(newViewDirection, newViewDirection, rotation);
        this.camera.setViewDirection(newViewDirection);
    }

}
