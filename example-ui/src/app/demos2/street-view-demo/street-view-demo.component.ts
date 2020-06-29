import { Component } from '@angular/core';
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
export class StreetViewDemoComponent {

    private renderer: Renderer;

    constructor(private rendererService: RendererService) {
        this.renderer = this.rendererService.getRenderer();
    }

}
