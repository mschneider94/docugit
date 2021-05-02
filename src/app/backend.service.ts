import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, Subject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BackendService {

  constructor(
    private http: HttpClient
  ) { }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed: ${error.message}`);
      console.error(error);

      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }

  public getNavContent(api:string, owner: string, repo: string, branch: string, path?: string): Record<string,any>[] {
    // Define apiEndpoint
    let apiEndpoint: string = `${api.replace(/\/$/i, '')}/repos/${owner}/${repo}/contents`;
    if (typeof(path) === 'string' && path !== null && path.length) {
      apiEndpoint += `/${path.replace(/^\//i, '').replace(/\/$/i, '')}`;
    }
    apiEndpoint += `?ref=${branch}`;

    // Declare object to return
    let output: Record<string,any>[] = [];

    // Query Data and include in object
    this.http.get<Record<string,any>[]>(
      apiEndpoint,
      {
        headers: new HttpHeaders({ 
          'Content-Type': 'application/json'
        })
      }
    ).pipe(
      tap(_ => console.debug(`BackendService.getNavContent: ${apiEndpoint}`)),
      catchError(this.handleError<Record<string,any>[]>(`BackendService.getNavContent: ${apiEndpoint}`, []))
    ).subscribe(result => {
      // iterate over items of result
      for (let item of result) {
        if (item.type === 'dir' || (item.type === 'file' && /\.md$/i.test(item.path)))
        output.push({
          name: item.name,
          path: item.type === 'file' ? '/' + item.path : null,
          content: item.type === 'dir' ? this.getNavContent(api, owner, repo, branch, item.path) : []
        });
      }
    });

    // return object
    return output;
  }

  public document$ = new Subject<string>();
  public updateDocument(api:string, owner: string, repo: string, branch: string, path: string): void {
    let rawContent$: Observable<string>;

    // request contentDefinition from API
    this.http.get<Record<string,any>>(
      `${api.replace(/\/$/i, '')}/repos/${owner}/${repo}/contents/${path.replace(/^\//i, '').replace(/\/$/i, '')}?ref=${branch}`, 
      {
        headers: new HttpHeaders({ 
          'Content-Type': 'application/json'
        })
      }
    ).pipe(
      tap(_ => console.debug(`BackendService.getDocument: contents: ${api.replace(/\/$/i, '')}/repos/${owner}/${repo}/contents/${path.replace(/^\//i, '').replace(/\/$/i, '')}?ref=${branch}`)),
      catchError(this.handleError<Record<string,any>>(`BackendService.getDocument: contents: ${api.replace(/\/$/i, '')}/repos/${owner}/${repo}/contents/${path.replace(/^\//i, '').replace(/\/$/i, '')}?ref=${branch}`, {}))
    ).subscribe(result => {
      if (typeof(result) === 'object' && result.type === 'file') {
        if (/^http[s]{0,1}:\/\/(.*\.)*github\.[a-z]*(\/.*)*$/i.test(api)) {
          // GitHub: download rawContent from download_url
          rawContent$ = this.http.get(
            result.download_url,
            {
              headers: new HttpHeaders({ 
                'Content-Type': 'text/plain'
              }),
              responseType: 'text'
            }
          ).pipe(
            tap(_ => console.debug(`BackendService.getDocument: markdown ${result.download_url}`)),
            catchError(this.handleError<string>(`BackendService.getDocument: markdown ${result.download_url}`, ''))
          );
        } else {
          // Other: request rawContent from API
          rawContent$ = this.http.get(
            `${api}/repos/${owner}/${repo}/raw/${path}?ref=${branch}`,
            {
              headers: new HttpHeaders({ 
                'Content-Type': 'text/plain'
              }),
              responseType: 'text'
            }
          ).pipe(
            tap(_ => console.debug(`BackendService.getDocument: markdown ${api}/repos/${owner}/${repo}/raw/${path}?ref=${branch}`)),
            catchError(this.handleError<string>(`BackendService.getDocument: markdown ${api}/repos/${owner}/${repo}/raw/${path}?ref=${branch}`, ''))
          )
        }
        // convert markdown into html
        rawContent$.subscribe(markdown => {
          this.http.post(
            `${api}/markdown/raw`, 
            markdown, 
            {
              headers: new HttpHeaders({ 
                'Content-Type': 'text/plain'
              }),
              responseType: 'text'
            }
          ).pipe(
            tap(_ => console.debug(`BackendService.getDocument: html ${api}/markdown/raw`)),
            catchError(this.handleError<string>(`BackendService.getDocument: html ${api}/markdown/raw`, ''))
          ).subscribe(html => this.document$.next(html));
        })
      }
    });
  }
}
