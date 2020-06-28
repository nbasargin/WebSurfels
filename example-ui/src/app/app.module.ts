import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DemoSelectionComponent } from './components/demo-selection/demo-selection.component';
import { MainOverlayComponent } from './main-overlay/main-overlay.component';
import { MainSettingsComponent } from './components/demo-base/settings/main-settings/main-settings.component';
import { SectionLabelComponent } from './components/demo-base/settings/section-label/section-label.component';
import { MainComponent } from './components/main/main.component';
import { LodTreeDemoComponent } from './demos2/lod-tree-demo/lod-tree-demo.component';
import { DemoSettingsComponent } from './components/demo-base/settings/demo-settings/demo-settings.component';
import { DemoBaseComponent } from './components/demo-base/demo-base.component';
import { LodConstructionDemoComponent } from './demos2/lod-construction-demo/lod-construction-demo.component';
import { StreetViewDemoComponent } from './demos2/street-view-demo/street-view-demo.component';
import { SphereBenchmarkDemoComponent } from './demos2/sphere-benchmark-demo/sphere-benchmark-demo.component';

@NgModule({
    declarations: [
        AppComponent,
        MainOverlayComponent,
        MainSettingsComponent,
        SectionLabelComponent,
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
    ],
    providers: [],
    bootstrap: [MainComponent]
})
export class AppModule {
}
