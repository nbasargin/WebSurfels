import { vec3 } from 'web-surfels';
import { DynamicLodController } from 'web-surfels';
import { XhrLodLoader } from 'web-surfels';
import { OrbitAnimationController } from 'web-surfels';
import { Renderer } from 'web-surfels';
import { Benchmark } from '../benchmarks/benchmark';
import { CameraPath } from '../benchmarks/camera-path';
import { DemoBase } from './demo-base';

export class DynamicLodLoadingDemo implements DemoBase {

    preferredMovementSpeed = 10;

    dynamicLod: DynamicLodController;
    initialSizeThreshold = 1.4;

    benchmark: Benchmark;

    constructor(
        public renderer: Renderer,
        private orbitAnimation: OrbitAnimationController,

    ) {
        this.renderer.camera.setUpVector([0, 1, 0]);

        this.orbitAnimation.minDistance = 30;
        this.orbitAnimation.maxDistance = 100;
        this.orbitAnimation.cameraElevation = 30;
        this.orbitAnimation.rotationDuration = 15000 * this.preferredMovementSpeed;

        this.orbitAnimation.animate(0);

        const loader = new XhrLodLoader('http://localhost:5000/lod/');
        this.dynamicLod = new DynamicLodController(this.renderer, loader, this.initialSizeThreshold, {strategy: 'nthFrame', unloadThreshold: 100, nthFrame: 50});

        const cameraPath = new CameraPath(renderer.camera, [
            {
                pos: vec3.fromValues(-123.87712097167969, 40.665348052978516, 130.97201538085938),
                viewDirection: vec3.fromValues(0.5519500970840454, -0.29570692777633667, -0.779684841632843)
            },
            {
                pos: vec3.fromValues(-73.01689147949219, -1.5608155727386475, 22.44899559020996),
                viewDirection: vec3.fromValues( 0.9303686022758484, -0.21983617544174194, -0.29340478777885437)
            },
            {
                pos: vec3.fromValues(-26.93488883972168, -11.340331077575684, 9.762529373168945),
                viewDirection: vec3.fromValues(0.9359492063522339, 0.2806718647480011, -0.21265564858913422)
            },
            {
                pos: vec3.fromValues(54.45912170410156, 5.940879821777344, -11.91900634765625),
                viewDirection: vec3.fromValues(-0.7393689751625061, -0.08367259055376053, 0.6680811047554016)
            },
            {
                pos: vec3.fromValues(111.23981475830078, 52.36388397216797, -50.063785552978516),
                viewDirection: vec3.fromValues(-0.6645565032958984, -0.5060217976570129, 0.5498241186141968)
            },
        ]);

        this.benchmark = new Benchmark(cameraPath);
    }

}
