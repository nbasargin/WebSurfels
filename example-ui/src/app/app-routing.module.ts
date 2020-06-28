import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DemoBaseComponent } from './components/demo-base/demo-base.component';
import { MainOverviewComponent } from './components/main-overview/main-overview.component';
import { SubpageComponent } from './components/subpage/subpage.component';


const routes: Routes = [
    {
        path: '',
        component: MainOverviewComponent
    },
    {
        path: 'demo',
        component: DemoBaseComponent,
        children: [
            {path: 'subpage', component: SubpageComponent},
            {path: '**', redirectTo: 'subpage'}
        ]
    },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
