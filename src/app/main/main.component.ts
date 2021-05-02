import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { BackendService } from '../backend.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {

  constructor(
    private router: Router,
    private backendService: BackendService
  ) { }

  ngOnInit(): void {
    this.navigation = this.backendService.getNavContent(this.api, this.owner, this.repo, this.branch, environment.git_folder);
    this.backendService.document$.subscribe(document => this.document = document);
    this.backendService.updateDocument(this.api, this.owner, this.repo, this.branch, this.router.url);
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentURL = event.url;
        this.backendService.updateDocument(this.api, this.owner, this.repo, this.branch, event.url);
      }
    });
    console.log(this.document);
  }

  private api = environment.git_api;
  private owner = environment.git_owner;
  private repo = environment.git_repo;
  private branch = environment.git_branch;

  public navigation: Record<string,any>[] = [];

  public currentURL: string = this.router.url;
  public document: string = null;
}
