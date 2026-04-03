import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { ArticlesBrowseComponent } from './articles-browse/articles-browse';
import { SummaryComponent } from './summary/summary';
import { summaryPageResolver } from './summary/summary-page.resolver';

const summaryGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const v = route.queryParams['v'];
  const lang = route.queryParams['lang'];
  return (v && lang) ? true : inject(Router).createUrlTree(['/']);
};

export const routes: Routes = [
  { path: '', component: ArticlesBrowseComponent },
  { path: 'summary', component: SummaryComponent, canActivate: [summaryGuard], resolve: { pageData: summaryPageResolver } },
  { path: '**', redirectTo: '' },
];
