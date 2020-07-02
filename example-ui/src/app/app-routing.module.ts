import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DemoBaseComponent } from './components/demo-base/demo-base.component';
import { DemoSelectionComponent } from './components/demo-selection/demo-selection.component';
import { LodConstructionDemoComponent } from './demos/lod-construction-demo/lod-construction-demo.component';
import { LodTreeDemoComponent } from './demos/lod-tree-demo/lod-tree-demo.component';
import { SphereBenchmarkDemoComponent } from './demos/sphere-benchmark-demo/sphere-benchmark-demo.component';
import { StreetViewDemoComponent } from './demos/street-view-demo/street-view-demo.component';


const routes: Routes = [
    {
        path: '',
        component: DemoSelectionComponent
    },
    {
        path: 'demo',
        component: DemoBaseComponent,
        children: [
            {path: 'lod-tree', component: LodTreeDemoComponent},
            {path: 'lod-construction', component: LodConstructionDemoComponent},
            {path: 'street-view', component: StreetViewDemoComponent},
            {path: 'sphere-benchmark', component: SphereBenchmarkDemoComponent},
            {path: '**', redirectTo: 'lod-tree'}
        ]
    },
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
