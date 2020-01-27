import { vec3 } from 'gl-matrix';
import { Renderer2 } from '../renderer2/renderer2';

export class AnimatedCamera {

    private frame = 0;

    private pos: vec3 = vec3.create();
    private target: vec3 = vec3.fromValues(0, 0.2, 0);
    private up: vec3 = vec3.fromValues(0, 1, 0);

    nextFrame(renderer: Renderer2) {
        this.frame++;
        const twoPi = Math.PI * 2;
        const dist = 2 * (2 + Math.cos(this.frame / 2400 * twoPi));
        const y = 0.4;

        const angle = this.frame / 700 * twoPi;
        const x = dist * Math.cos(angle);
        const z = dist * Math.sin(angle);

        this.pos[0] = x;
        this.pos[1] = y;
        this.pos[2] = z;
        renderer.setCameraOrientation(this.pos, this.target, this.up);
    }

}
