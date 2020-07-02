import { Component } from '@angular/core';

@Component({
    selector: 'app-demo-selection',
    template: `
        <div class="main-overview-header">
            WebSurfels Demos
        </div>
        
        <div class="main-grid">
            <div class="demo-block">
                <a [routerLink]="['./demo/lod-tree']" class="demo-block-content">
                    <mat-icon class="demo-icon">grid_on</mat-icon>
                    <div>LOD Tree</div>
                </a>
            </div>
            <div class="demo-block">
                <a [routerLink]="['./demo/lod-construction']" class="demo-block-content">
                    <mat-icon class="demo-icon">construction</mat-icon>
                    <div>LOD Construction</div>
                </a>
            </div>
            <div class="demo-block">
                <a [routerLink]="['./demo/street-view']" class="demo-block-content">
                    <mat-icon class="demo-icon">map</mat-icon>
                    <div>Street View</div>
                </a>
            </div>
            <div class="demo-block">
                <a [routerLink]="['./demo/sphere-benchmark']" class="demo-block-content">
                    <mat-icon class="demo-icon">lens</mat-icon>
                    <div>Sphere</div>
                </a>
            </div>
        </div>
    `,
    styleUrls: ['./demo-selection.component.scss']
})
export class DemoSelectionComponent {

}
