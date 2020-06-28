import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MainOverlayComponent } from './main-overlay/main-overlay.component';
import { MainSettingsComponent } from './components/settings/main-settings/main-settings.component';
import { SectionLabelComponent } from './components/settings/section-label/section-label.component';
import { MainComponent } from './components/main/main.component';
import { SubpageComponent } from './components/subpage/subpage.component';
import { DemoSettingsComponent } from './components/settings/demo-settings/demo-settings.component';
import { DemoBaseComponent } from './components/demo-base/demo-base.component';
import { MainOverviewComponent } from './components/main-overview/main-overview.component';

@NgModule({
    declarations: [
        AppComponent,
        MainOverlayComponent,
        MainSettingsComponent,
        SectionLabelComponent,
        MainComponent,
        SubpageComponent,
        DemoSettingsComponent,
        DemoBaseComponent,
        MainOverviewComponent
    ],
    imports: [
        BrowserModule,
        ReactiveFormsModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MatExpansionModule,
        MatIconModule,
    ],
    providers: [],
    bootstrap: [MainComponent]
})
export class AppModule {
}
