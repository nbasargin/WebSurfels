import { vec3 } from 'gl-matrix';
import { Plane2 } from './plane2';

export class Frustum {

    private fovRadians: number;
    private aspectRatio: number;
    private nearDist: number;
    private farDist: number;

    private eye: vec3 | Array<number>;
    private target: vec3 | Array<number>;
    private up: vec3 | Array<number>;

    public readonly planes: { near: Plane2, far: Plane2, top: Plane2, bottom: Plane2, left: Plane2, right: Plane2 };

    constructor() {
        this.planes = {
            near: new Plane2(),
            far: new Plane2(),
            top: new Plane2(),
            bottom: new Plane2(),
            left: new Plane2(),
            right: new Plane2()
        }
    }

    setPerspectiveParams(fovRadians: number, aspectRatio: number, near: number, far: number) {
        this.fovRadians = fovRadians;
        this.aspectRatio = aspectRatio;
        this.nearDist = near;
        this.farDist = far;
    }

    setCameraOrientation(eye: vec3 | Array<number>, target: vec3 | Array<number>, up: vec3 | Array<number>) {
        this.eye = eye;
        this.target = target;
        this.up = up;
    }

    updateFrustumPlanes() {
        const fovTan = 2 * Math.tan(this.fovRadians / 2);
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

        this.planes.near.setNormalAndPoint(negZ, centerNear);
        this.planes.far.setNormalAndPoint(zAxis, centerFar);

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
        this.planes.top.setNormalAndPoint(normalTop, nearTop);

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
        this.planes.bottom.setNormalAndPoint(normalBottom, nearBottom);

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
        this.planes.left.setNormalAndPoint(normalLeft, nearLeft);

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
        this.planes.right.setNormalAndPoint(normalRight, nearRight);
    }

}
