import { mat4, vec3 } from 'gl-matrix';
import { Plane } from '../utils/plane';

/**
 * Default coordinate system: Z up, looking along y axis, x goes to the right.
 */
export class Camera {

    projectionMatrix: mat4 = mat4.create();
    modelViewMatrix: mat4 = mat4.create();
    modelViewMatrixIT: mat4 = mat4.create();

    eye: vec3 = vec3.fromValues(0, 0, 0);
    target: vec3 = vec3.fromValues(0, 1, 0);
    up: vec3 = vec3.fromValues(0, 0, 1); // should be normalized

    viewDirection: vec3 = vec3.create(); // should be normalized (see constructor)

    private fovRadians: number = Math.PI / 3;
    private aspectRatio: number = 1;
    private nearDist: number = 0.1;
    private farDist: number = 10000;

    private frustumPlanes = {
        near: new Plane(),
        far: new Plane(),
        top: new Plane(),
        bottom: new Plane(),
        left: new Plane(),
        right: new Plane()
    };

    constructor() {
        vec3.subtract(this.viewDirection, this.target, this.eye);
        vec3.normalize(this.viewDirection, this.viewDirection);

        this.updateProjection();
        this.updateModelView();
        this.updateFrustum();
    }

    setOrientation(eye: Float32Array | number[], target: Float32Array | number[], up: Float32Array | number[]) {
        vec3.set(this.eye, eye[0], eye[1], eye[2]);
        vec3.set(this.target, target[0], target[1], target[2]);
        vec3.set(this.up, up[0], up[1], up[2]);
        vec3.subtract(this.viewDirection, this.target, this.eye);
        vec3.normalize(this.viewDirection, this.viewDirection);
        this.updateModelView();
        this.updateFrustum();
    }

    setEyePosition(eye: Float32Array | number[]) {
        vec3.set(this.eye, eye[0], eye[1], eye[2]);
        vec3.subtract(this.viewDirection, this.target, this.eye);
        vec3.normalize(this.viewDirection, this.viewDirection);
        this.updateModelView();
        this.updateFrustum();
    }

    setUpVector(up: Float32Array | number[]) {
        vec3.set(this.up, up[0], up[1], up[2]);
        vec3.normalize(this.up, this.up);
        this.updateModelView();
        this.updateFrustum();
    }

    setViewDirection(direction: Float32Array | number[]) {
        vec3.set(this.viewDirection, direction[0], direction[1], direction[2]);
        vec3.normalize(this.viewDirection, this.viewDirection);
        vec3.add(this.target, this.eye, this.viewDirection);
        this.updateModelView();
        this.updateFrustum();
    }

    setFieldOfView(fovRadians: number) {
        this.fovRadians = fovRadians;
        this.updateProjection();
        this.updateFrustum();
    }

    setClippingDist(near: number, far: number) {
        this.nearDist = near;
        this.farDist = far;
        this.updateProjection();
        this.updateFrustum();
    }

    setAspectRatio(aspect: number) {
        this.aspectRatio = aspect;
        this.updateProjection();
        this.updateFrustum();
    }

    isZAxisUp() {
        return this.up[0] === 0 && this.up[1] === 0 && Math.abs(this.up[2]) === 1;
    }

    isSphereInFrustum(cx: number, cy: number, cz: number, r: number): boolean {
        for (const plane of Object.values(this.frustumPlanes)) {
            const dist = plane.pointDistance(cx, cy, cz);
            if (dist < -r) {
                return false;
            }
            // if dist < radius -> intersection with plane
        }
        return true;
    }

    getDistanceToEye(x: number, y: number, z: number) {
        const dx = this.eye[0] - x;
        const dy = this.eye[1] - y;
        const dz = this.eye[2] - z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    getProjectedSphereSize(cx: number, cy: number, cz: number, r: number) {
        // https://stackoverflow.com/questions/21648630/radius-of-projected-sphere-in-screen-space
        const dist = this.getDistanceToEye(cx, cy, cz);
        const horizon = dist ** 2 - r ** 2;
        if (horizon < 0) {
            return Number.MAX_VALUE; // inside the sphere -> size is larger than the screen
        }
        return (1 / Math.tan(this.fovRadians / 2)) * r / Math.sqrt(horizon);
    }


    private updateProjection() {
        mat4.perspective(this.projectionMatrix, this.fovRadians, this.aspectRatio, this.nearDist, this.farDist);
    }

    private updateModelView() {
        mat4.lookAt(this.modelViewMatrix, this.eye, this.target, this.up);
        mat4.invert(this.modelViewMatrixIT, this.modelViewMatrix);
        mat4.transpose(this.modelViewMatrixIT, this.modelViewMatrixIT);
    }

    private updateFrustum() {
        const fovTan = Math.tan(this.fovRadians / 2);
        const hNear = fovTan * this.nearDist;
        const wNear = hNear * this.aspectRatio;
        // const hFar = fovTan * this.farDist;
        // const wFar = hFar * this.aspectRatio;

        // Z axis: points in the opposite direction from the looking direction
        const zAxis = vec3.create();
        vec3.sub(zAxis, this.eye, this.target);
        vec3.normalize(zAxis, zAxis);

        // X axis: cross product of up vector and Z
        const xAxis = vec3.create();
        vec3.cross(xAxis, this.up, zAxis);
        vec3.normalize(xAxis, xAxis);

        // Y axis: cross product of Z and X
        const yAxis = vec3.create();
        vec3.cross(yAxis, zAxis, xAxis);

        // centers of the near and far planes
        const centerNear = vec3.create();
        vec3.scaleAndAdd(centerNear, this.eye, zAxis, this.nearDist * -1); // centerNear = eye - zAxis * nearDist
        const centerFar = vec3.create();
        vec3.scaleAndAdd(centerFar, this.eye, zAxis, this.farDist * -1); // centerFar = eye - zAxis * farDist

        const negZ = vec3.create();
        vec3.scale(negZ, zAxis, -1);

        this.frustumPlanes.near.setNormalAndPoint(negZ, centerNear);
        this.frustumPlanes.far.setNormalAndPoint(zAxis, centerFar);

        // top plane
        // point = centerNear + yAxis * hNear
        const nearTop = vec3.create();
        vec3.scaleAndAdd(nearTop, centerNear, yAxis, hNear);
        // normal = normalize(nearTop - this.eye) cross xAxis
        const eyeToNearTop = vec3.create();
        vec3.sub(eyeToNearTop, nearTop, this.eye);
        vec3.normalize(eyeToNearTop, eyeToNearTop);
        const normalTop = vec3.create();
        vec3.cross(normalTop, eyeToNearTop, xAxis);
        this.frustumPlanes.top.setNormalAndPoint(normalTop, nearTop);

        // bottom plane
        // point = centerNear - yAxis * hNear
        const nearBottom = vec3.create();
        vec3.scaleAndAdd(nearBottom, centerNear, yAxis, hNear * -1);
        // normal = xAxis cross normalize(nearTop - this.eye)
        const eyeToNearBottom = vec3.create();
        vec3.sub(eyeToNearBottom, nearBottom, this.eye);
        vec3.normalize(eyeToNearBottom, eyeToNearBottom);
        const normalBottom = vec3.create();
        vec3.cross(normalBottom, xAxis, eyeToNearBottom);
        this.frustumPlanes.bottom.setNormalAndPoint(normalBottom, nearBottom);

        // left plane
        // point = centerNear - xAxis * wNear
        const nearLeft = vec3.create();
        vec3.scaleAndAdd(nearLeft, centerNear, xAxis, wNear * -1);
        // normal = normalize(nearLeft - this.eye) cross yAxis
        const eyeToNearLeft = vec3.create();
        vec3.sub(eyeToNearLeft, nearLeft, this.eye);
        vec3.normalize(eyeToNearLeft, eyeToNearLeft);
        const normalLeft = vec3.create();
        vec3.cross(normalLeft, eyeToNearLeft, yAxis);
        this.frustumPlanes.left.setNormalAndPoint(normalLeft, nearLeft);

        // right plane
        // point = centerNear + xAxis * wNear
        const nearRight = vec3.create();
        vec3.scaleAndAdd(nearRight, centerNear, xAxis, wNear);
        // normal = yAxis cross normalize(nearRight - this.eye)
        const eyeToNearRight = vec3.create();
        vec3.sub(eyeToNearRight, nearRight, this.eye);
        vec3.normalize(eyeToNearRight, eyeToNearRight);
        const normalRight = vec3.create();
        vec3.cross(normalRight, yAxis, eyeToNearRight);
        this.frustumPlanes.right.setNormalAndPoint(normalRight, nearRight);
    }

}
