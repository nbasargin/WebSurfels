import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-main-overlay',
    template: `
        <h1>
            Surfels: main settings
        </h1>
        <div class="main-options">
            <span>FPS:</span>
            <span>{{fps.toFixed(2)}}</span>

            <label class="span-2">
                <input #hqCheck type="checkbox" [checked]="hqSplats" (change)="hqSplatsChange.emit(hqCheck.checked)"> HQ Splats
            </label>

            <span>Points:</span>
            <span>{{points.toLocaleString('en-us')}}</span>

            <span>Nodes:</span>
            <span>{{nodes.toLocaleString('en-us')}}</span>

            <span>Scale:</span>
            <span>{{scale.toFixed(1)}}</span>
            <input class="span-2" #sizeScaleSlider (input)="scaleChange.emit(+sizeScaleSlider.value)"
                   type="range" min="0.2" max="2" step="0.1" value="1">

            <span>Speed:</span>
            <span>{{speed.toFixed(2)}}</span>
            
            <label class="span-2">
                <input #animCheck type="checkbox" [checked]="animate" (change)="animateChange.emit(animCheck.checked)"> Animate
            </label>
        </div>
        
        <ng-content></ng-content>        
        
    `,
    styleUrls: ['./main-overlay.component.scss']
})
export class MainOverlayComponent {

    @Input() fps: number = 0;
    @Input() points: number = 0;
    @Input() nodes: number = 0;
    @Input() speed: number = 1;

    @Input() animate: boolean = false;
    @Input() hqSplats: boolean = false;
    @Input() scale: number = 1;

    @Output() animateChange: EventEmitter<boolean> = new EventEmitter();
    @Output() hqSplatsChange: EventEmitter<boolean> = new EventEmitter();
    @Output() scaleChange: EventEmitter<number> = new EventEmitter();

}
