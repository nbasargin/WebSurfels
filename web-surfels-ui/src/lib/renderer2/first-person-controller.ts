import { mat4, vec3 } from 'gl-matrix';
import { Camera } from './camera';

export class FirstPersonController {

    pitch: number = 0;
    yaw: number = 0;

    constructor(private camera: Camera) {
    }

    moveForward(distance: number) {
        vec3.scaleAndAdd(this.camera.eye, this.camera.eye, this.camera.viewDirection, distance);
        vec3.scaleAndAdd(this.camera.target, this.camera.target, this.camera.viewDirection, distance);
        this.camera.setOrientation(this.camera.eye, this.camera.target, this.camera.up);
    }

    moveRight(distance: number) {
        const right = vec3.create();
        vec3.cross(right, this.camera.viewDirection, this.camera.up);
        vec3.scaleAndAdd(this.camera.eye, this.camera.eye, right, distance);
        vec3.scaleAndAdd(this.camera.target, this.camera.target, right, distance);
        this.camera.setOrientation(this.camera.eye, this.camera.target, this.camera.up);
    }

    addPitch(pitch: number) {
        this.setViewDirection(this.pitch + pitch, this.yaw);
    }

    addYaw(yaw: number) {
        this.setViewDirection(this.pitch, this.yaw + yaw);
    }

    setViewDirection(pitch: number, yaw: number) {
        this.pitch = Math.min(89.99, Math.max(-89.99, pitch));
        this.yaw = yaw;

        const up = this.camera.up;
        let frontReference = vec3.fromValues(0, 0, 1);
        if (Math.abs(up[0]) === 1 && up[1] === 0 && up[2] === 0) {
            frontReference = vec3.fromValues(0, 1, 0);
        }
        const right = vec3.create();
        vec3.cross(right, frontReference, up);
        vec3.normalize(right, right);
        const front = vec3.create();
        vec3.cross(front, up, right);
        vec3.normalize(front, front);

        const rot = mat4.create();
        mat4.rotate(rot, rot, this.yaw * Math.PI / 180, up);
        mat4.rotate(rot, rot, this.pitch * Math.PI / 180, right);
        vec3.transformMat4(front, front, rot);

        this.camera.setViewDirection(front);
    }

}
