import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MainOverlayComponent } from './main-overlay/main-overlay.component';
import { MainSettingsComponent } from './components/main-settings/main-settings.component';
import { SectionLabelComponent } from './components/section-label/section-label.component';
import { MainComponent } from './components/main/main.component';
import { SubpageComponent } from './components/subpage/subpage.component';

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
        BrowserAnimationsModule,
        MatExpansionModule,
        MatIconModule,
    ],
    providers: [],
    bootstrap: [MainComponent]
})
export class AppModule {
}
