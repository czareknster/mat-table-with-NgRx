import { Component, OnInit, ViewChild, ElementRef, OnDestroy, AfterViewInit } from '@angular/core';
import { Customer } from '../core/models/customer';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { GlobalState } from '../store/states/global.state';
import { Store, select } from '@ngrx/store';
import { selectAllCustomer, selectCustomerTotal, selectCustomerError, selectCustomerLoading } from '../store/selectors/customer.selectors';
import { CustomerLoadAction } from '../store/actions/customer.actions';
import { CustomerParams } from '../core/models/customer-params';
import { MatPaginator } from '@angular/material/paginator';
import { Observable, merge, Subject, Subscription } from 'rxjs';
import { tap, debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-customer-table',
  templateUrl: './customer-table.component.html',
  styleUrls: ['./customer-table.component.scss']
})
export class CustomerTableComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild(MatSort, { static: false }) sort: MatSort;
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;

  public displayedColumns: string[] = ['id', 'role', 'firstName', 'lastName', 'amount'];
  public dataSource: MatTableDataSource<Customer>;
  public customerTotal: number;
  public noData: Customer[] = [<Customer>{}];
  public loading: boolean;
  public error$: Observable<boolean>;
  public filterSubject = new Subject<string>();

  private defaultSort: Sort = { active: 'role', direction: 'asc' };
  private filter: string = "";
  private subscription: Subscription;

  constructor(public store: Store<GlobalState>) { }

  public ngOnInit(): void {
    this.store.dispatch(new CustomerLoadAction(
      <CustomerParams>{
        filter: this.filter,
        pageIndex: 0,
        pageSize: 3,
        sortDirection: this.defaultSort.direction,
        sortField: this.defaultSort.active
      }
    ));

    this.error$ = this.store.pipe(select(selectCustomerError));
    this.store.pipe(select(selectCustomerLoading)).subscribe(loading => {
      if (loading) {
        this.dataSource = new MatTableDataSource(this.noData);
      }
      this.loading = loading;
    });
    this.store.pipe(select(selectAllCustomer)).subscribe(customers => this.initializeData(customers));
    this.store.pipe(select(selectCustomerTotal)).subscribe(total => this.customerTotal = total);
  }

  public ngAfterViewInit(): void {
    let filter$ = this.filterSubject.pipe(
      debounceTime(150),
      distinctUntilChanged(),
      tap((value: string) => {
        this.paginator.pageIndex = 0;
        this.filter = value;
      })
    );

    let sort$ = this.sort.sortChange.pipe(tap(() => this.paginator.pageIndex = 0));

    this.subscription = merge(filter$, sort$, this.paginator.page).pipe(
      tap(() => this.loadCustomers())
    ).subscribe();
  }

  private loadCustomers(): void {
    this.store.dispatch(new CustomerLoadAction(
      <CustomerParams>{
        filter: this.filter.toLocaleLowerCase(),
        pageIndex: this.paginator.pageIndex,
        pageSize: this.paginator.pageSize,
        sortDirection: this.sort.direction,
        sortField: this.sort.active
      }
    ));
  }

  private initializeData(customers: Customer[]): void {
    this.dataSource = new MatTableDataSource(customers.length ? customers : this.noData);
  }

  public ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public retry(): void { 
    this.loadCustomers();
  }
}
