import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';

import { AppRoutingModule } from './app-routing.module';
import { DemoSelectionComponent } from './components/demo-selection/demo-selection.component';
import { MainSettingsComponent } from './components/settings/main-settings/main-settings.component';
import { MainComponent } from './components/main/main.component';
import { LodTreeDemoComponent } from './demos/lod-tree-demo/lod-tree-demo.component';
import { DemoSettingsComponent } from './components/settings/demo-settings/demo-settings.component';
import { DemoBaseComponent } from './components/demo-base/demo-base.component';
import { LodConstructionDemoComponent } from './demos/lod-construction-demo/lod-construction-demo.component';
import { StreetViewDemoComponent } from './demos/street-view-demo/street-view-demo.component';
import { SphereBenchmarkDemoComponent } from './demos/sphere-benchmark-demo/sphere-benchmark-demo.component';

@NgModule({
    declarations: [
        MainSettingsComponent,
        MainComponent,
        LodTreeDemoComponent,
        DemoSettingsComponent,
        DemoBaseComponent,
        DemoSelectionComponent,
        LodConstructionDemoComponent,
        StreetViewDemoComponent,
        SphereBenchmarkDemoComponent
    ],
    imports: [
        BrowserModule,
        ReactiveFormsModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MatExpansionModule,
        MatIconModule,
        MatButtonModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatSliderModule,
        MatTooltipModule,
        MatRadioModule,
    ],
    providers: [],
    bootstrap: [MainComponent]
})
export class AppModule {
}
