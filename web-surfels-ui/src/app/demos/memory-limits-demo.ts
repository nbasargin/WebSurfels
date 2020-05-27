import { Renderer } from '../../lib/renderer/renderer';
import { DummyData } from '../../lib/utils/dummy-data';
import { DemoBase } from './demo-base';

export class MemoryLimitsDemo implements DemoBase {

    preferredMovementSpeed = 1;
    testRunning = false;
    done = false;
    points = 0;

    constructor(
        public renderer: Renderer
    ) {
        this.renderer.removeAllNodes();
    }

    test() {
        if (this.testRunning || this.done) {
            return;
        }

        this.renderer.removeAllNodes();
        this.testRunning = true;

        console.log('starting test: uploading 100 M points to the GPU');

        let iterations = 100;

        const iteration = () => {
            this.renderer.addData(DummyData.generateSphere(1_000_000, 0.01));
            this.points += 1_000_000;
            iterations--;
            console.log('points on GPU:', this.points);
            if (iterations > 0) {
                setTimeout(() => {iteration()}, 100);
            } else {
                console.log('done!');
                this.done = true;
            }
        };

        iteration();
    }

    render() {
        this.renderer.render([]);
    }


}
