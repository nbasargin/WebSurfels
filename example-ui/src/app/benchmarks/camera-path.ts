import { vec3 } from 'web-surfels';
import { Camera } from 'web-surfels';

export class CameraPath {

    constructor(public camera: Camera, public points: Array<{ pos: vec3, viewDirection: vec3 }>) {
    }

    setCameraPosition(startPointID: number, progress: number = 0) {
        startPointID = Math.max(0, Math.min(Math.floor(startPointID), this.points.length - 1));

        const endPointID = Math.min(startPointID + 1, this.points.length - 1);
        const start = this.points[startPointID];
        const end = this.points[endPointID];

        const pos = vec3.create();
        vec3.scaleAndAdd(pos, pos, start.pos, 1 - progress);
        vec3.scaleAndAdd(pos, pos, end.pos, progress);

        const viewDirection = vec3.create();
        vec3.scaleAndAdd(viewDirection, viewDirection, start.viewDirection, 1 - progress);
        vec3.scaleAndAdd(viewDirection, viewDirection, end.viewDirection, progress);

        const target = vec3.create();
        vec3.add(target, pos, viewDirection);

        this.camera.setOrientation(pos, target, this.camera.up);
    }

}
