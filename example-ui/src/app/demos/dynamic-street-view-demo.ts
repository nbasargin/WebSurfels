import { vec3 } from 'web-surfels';
import { OrbitAnimationController } from 'web-surfels/lib/controllers/camera/orbit-animation-controller';
import { DynamicStreetViewController } from 'web-surfels/lib/controllers/dynamic-street-view/dynamic-street-view-controller';
import { LocalStreetViewApi } from 'web-surfels/lib/data/street-view/api/local-street-view-api';
import { StreetViewLoader } from 'web-surfels/lib/data/street-view/street-view-loader';
import { Renderer } from 'web-surfels/lib/renderer/renderer';
import { Benchmark } from '../benchmarks/benchmark';
import { CameraPath } from '../benchmarks/camera-path';
import { DemoBase } from './demo-base';

export class DynamicStreetViewDemo implements DemoBase {

    preferredMovementSpeed: number = 10;

    controller: DynamicStreetViewController;

    datasets = {
        paris25k: {
            path: 'paris25k',
            startID: 'PxH7e1kCSV7p728tziDR_w'
        },
        manhattan25k: {
            path: 'manhattan25k',
            startID: 'jdYd3nY9wyIGeb8l_zAYBA',
        },
        munich25k: {
            path: 'munich25k',
            startID: '92II9-zwofQNOu_3uN-yAg',
        }
    };

    benchmark: Benchmark;

    constructor(
        public renderer: Renderer,
        private orbitAnimation: OrbitAnimationController,
    ) {
        this.orbitAnimation.minDistance = 30;
        this.orbitAnimation.maxDistance = 100;
        this.orbitAnimation.cameraElevation = 30;
        this.orbitAnimation.rotationDuration = 15000 * this.preferredMovementSpeed;

        this.orbitAnimation.animate(0);

        const data = this.datasets.paris25k;

        // const api = new GoogleStreetViewApi();
        const api = new LocalStreetViewApi(`http://localhost:5000/gsv/${data.path}`);
        const loader = new StreetViewLoader(api, 0.4, 1.5);
        this.controller = new DynamicStreetViewController(renderer, loader, 50, 100, {
            softMinimum: 100_000_000,
            softMaximum: 120_000_000
        }, data.startID);

        const cameraPath = new CameraPath(renderer.camera, [
            {
                pos: vec3.fromValues(1240.0255126953125, 428.3453369140625, -51.90530776977539),
                viewDirection: vec3.fromValues(-0.9269274473190308, -0.3198262155056, -0.19625674188137054)
            },
            {
                pos: vec3.fromValues(389.5700378417969, 8.811860084533691, -333.1141052246094),
                viewDirection: vec3.fromValues(-0.5020412802696228, -0.8314081430435181, 0.23814919590950012)
            },
            {
                pos: vec3.fromValues(329.5191650390625, -384.33477783203125, -177.86441040039062),
                viewDirection: vec3.fromValues(-0.7333635091781616, 0.6777465343475342, -0.053268913179636)
            },
            {
                pos: vec3.fromValues(-180.10511779785156, -241.0279083251953, 211.83261108398438),
                viewDirection: vec3.fromValues(-0.01191917434334755, 0.8558781147003174, -0.5170401930809021)
            },

            {
                pos: vec3.fromValues(-259.0425720214844, -459.4671630859375, 533.74365234375),
                viewDirection: vec3.fromValues(0.06708746403455734, 0.5258428454399109, -0.8479319214820862)
            },
            {
                pos: vec3.fromValues(-360.62603759765625, -110.98513793945312, 386.25799560546875),
                viewDirection: vec3.fromValues(0.15893428027629852, 0.36665815114974976, -0.9166797399520874)
            },
            {
                pos: vec3.fromValues(-270.24658203125, 123.03898620605469, 272.4951171875),
                viewDirection: vec3.fromValues(-0.25811368227005005, -0.8686648607254028, -0.42284587025642395)
            },
            {
                pos: vec3.fromValues(-124.8250961303711, 573.46044921875, 117.2672119140625),
                viewDirection: vec3.fromValues(-0.9989715218544006, -0.04266732931137085, 0.015343156643211842)
            },

        ]);

        this.benchmark = new Benchmark(cameraPath);
    }

}
