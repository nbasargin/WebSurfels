import { Component } from '@angular/core';

@Component({
    selector: 'app-demo-selection',
    template: `
        <div class="main-overview-header">
            WebSurfels Demo
        </div>
        <div class="main-overview-demos">
            <span>
                <a [routerLink]="['./demo/lod-tree']">LOD Tree</a>
            </span>
            <span>
                <a [routerLink]="['./demo/lod-construction']">LOD Construction</a>
            </span>
            <span>
                <a [routerLink]="['./demo/street-view']">Street View</a>
            </span>
            <span>
                <a [routerLink]="['./demo/sphere-benchmark']">Sphere Benchmark</a>
            </span>
        </div>
    `,
    styleUrls: ['./demo-selection.component.scss']
})
export class DemoSelectionComponent {

}
