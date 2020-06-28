import { AfterViewInit, Component } from '@angular/core';
import { RendererService } from '../../services/renderer.service';

import { Renderer } from 'web-surfels';

@Component({
    selector: 'app-street-view-demo',
    template: `
        <p>
            street-view-demo works!
        </p>
    `,
    styleUrls: ['./street-view-demo.component.scss']
})
export class StreetViewDemoComponent implements AfterViewInit {

    private renderer: Renderer;

    constructor(private rendererService: RendererService) {
    }

    ngAfterViewInit(): void {
        this.renderer = this.rendererService.getRenderer();
    }

}
