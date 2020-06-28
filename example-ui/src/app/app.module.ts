import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { MainOverlayComponent } from './main-overlay/main-overlay.component';
import { MainSettingsComponent } from './components/main-settings/main-settings.component';
import { SectionLabelComponent } from './components/section-label/section-label.component';
import { AppRoutingModule } from './app-routing.module';
import { MainComponent } from './components/main/main.component';
import { SubpageComponent } from './components/subpage/subpage.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
    declarations: [
        AppComponent,
        MainOverlayComponent,
        MainSettingsComponent,
        SectionLabelComponent,
        MainComponent,
        SubpageComponent
    ],
    imports: [
        BrowserModule,
        ReactiveFormsModule,
        AppRoutingModule,
        BrowserAnimationsModule
    ],
    providers: [],
    bootstrap: [MainComponent]
})
export class AppModule {
}
