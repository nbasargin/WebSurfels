import { Component, OnDestroy } from '@angular/core';

import { PLYLoader } from '@loaders.gl/ply';
import { parse } from '@loaders.gl/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
    BinaryXHR,
    BoundingBox,
    LodNode,
    OctreeLodBuilder,
    PointCloudData,
    Renderer,
    Timing,
    WeightedLodNode
} from 'web-surfels';

import { RendererService } from '../../services/renderer.service';


@Component({
    selector: 'app-lod-construction',
    template: `
        <mat-expansion-panel>
            <mat-expansion-panel-header>
                <mat-panel-title>About LOD Construction</mat-panel-title>
            </mat-expansion-panel-header>
            <div>
                This demo loads a point cloud from a PLY file, constructs an octree and generates LOD representations.
                All processing steps run directly in the browser.
            </div>
        </mat-expansion-panel>

        <mat-expansion-panel [expanded]="true">
            <mat-expansion-panel-header>
                <mat-panel-title>{{loading ? 'Loading...' : 'Settings'}}</mat-panel-title>
            </mat-expansion-panel-header>
            <ng-container *ngIf="loading">
                Check the browser console for progress or error messages.
            </ng-container>
            <ng-container *ngIf="!loading">
                <div>
                    LOD level:
                    <mat-slider style="width: 100%"
                                [value]="lodLevel"
                                [color]="'primary'" [max]="treeDepth" [step]="1"
                                [tickInterval]="1" thumbLabel
                                (input)="lodLevel = $event.value; updateDisplayedLOD()"
                    ></mat-slider>
                </div>

                <mat-slide-toggle
                        [color]="'primary'"
                        [checked]="jitter"
                        (change)="jitter = $event.checked; updateDisplayedLOD()"
                >Enable jitter
                </mat-slide-toggle>
            </ng-container>
        </mat-expansion-panel>
    `,
    styleUrls: ['./lod-construction-demo.component.scss']
})
export class LodConstructionDemoComponent implements OnDestroy {

    private renderer: Renderer;

    loading: boolean = true;
    active: boolean = true;
    private destroyed$: Subject<void> = new Subject();

    treeDepth: number;
    lodLevel: number = 3;
    jitter: boolean = true;

    private lodRoot: WeightedLodNode;
    private lodRootJitter: WeightedLodNode;

    constructor(private rendererService: RendererService) {
        this.renderer = this.rendererService.getRenderer();
        this.loadDragon();

        this.rendererService.setFpsAveragingWindow(20);
        this.rendererService.setControlMode('first-person');
        this.rendererService.setMovementSpeed(0.005);
        this.renderer.camera.setOrientation([-0.05, 0.2, 0.2], [0, 0.12, 0], [0, 1, 0]);
        this.renderer.camera.setClippingDist(0.001, 100);

        this.rendererService.nextFrame.pipe(takeUntil(this.destroyed$)).subscribe(() => {
            this.renderer.render();
        });
    }

    ngOnDestroy(): void {
        this.active = false;
        this.renderer.removeAllNodes();
        this.renderer.render();
        this.destroyed$.next();
        this.destroyed$.complete();
    }

    private loadDragon() {
        const resolution: number = 32;
        const maxDepth: number = 10;

        Timing.measure();
        console.log('Loading point cloud...');
        const url = 'https://www.dl.dropboxusercontent.com/s/9inx5f1n5sm2cp8/stanford_dragon.ply?dl=1';
        BinaryXHR.get(url).then(buffer => {
            return parse(buffer, PLYLoader);
        }).then(rawData => {
            console.log('Data loaded in', Timing.measure(), 'ms, preprocessing...');

            if (!this.active) {
                console.log('Cancel preprocessing since this component is no longer active.');
                return;
            }

            const data: PointCloudData = {
                positions: rawData.attributes.POSITION.value,
                sizes: new Float32Array(Math.floor(rawData.attributes.POSITION.value.length / 3)).fill(0.0015),
                normals: rawData.attributes.NORMAL.value,
                colors: new Float32Array(rawData.attributes.COLOR_0.value).map(c => c / 255),
            };
            console.log('Data preprocessed in', Timing.measure(), 'ms, building octree...');

            const bb = BoundingBox.create(data.positions);
            const octree = new OctreeLodBuilder(bb, resolution, maxDepth);
            octree.addData(data);
            console.log('Octree created in', Timing.measure(), 'ms, constructing LOD...');

            this.treeDepth = octree.root.getDepth() - 1;
            this.lodRoot = octree.buildLod(0);
            console.log('LOD constructed in', Timing.measure(), 'ms, creating another octree and LOD with jitter...');

            // now with jitter
            octree.addData(data);
            this.lodRootJitter = octree.buildLod(1);
            console.log('Octree and LOD with jitter created in', Timing.measure());

            this.updateDisplayedLOD();
            this.loading = false;

        });
    }

    updateDisplayedLOD() {
        this.renderer.removeAllNodes();
        const nodes = this.getNodesAtSpecificDepth(this.jitter ? this.lodRootJitter : this.lodRoot, this.lodLevel);
        for (const node of nodes) {
            this.renderer.addData(node.data);
        }
    }

    private getNodesAtSpecificDepth(root: LodNode, depth: number): Array<LodNode> {
        if (depth <= 0 || root.children.length == 0) {
            return [root];
        } else {
            let nodes: Array<LodNode> = [];
            for (const child of root.children) {
                nodes = nodes.concat(this.getNodesAtSpecificDepth(child, depth - 1));
            }
            return nodes;
        }
    }

}
