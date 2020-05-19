import { StreetViewLoader } from '../../data/street-view/street-view-loader';
import { Renderer } from '../../renderer/renderer';

export class DynamicStreetViewController {

    constructor(
        public renderer: Renderer,
        public loader: StreetViewLoader,
        public qualityDist: number, // distance within highest quality will be used
        public startPanoramaID: string,
    ) {

    }


}
