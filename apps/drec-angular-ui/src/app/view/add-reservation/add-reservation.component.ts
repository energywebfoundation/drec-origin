import { SelectionModel } from '@angular/cdk/collections';
import { Component, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { AuthbaseService } from '../../auth/authbase.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, FormArray, Validators, FormControl } from '@angular/forms';
import { ParseTreeResult } from '@angular/compiler';
import { ToastrService } from 'ngx-toastr';
import { DeviceService } from '../../auth/services/device.service'
@Component({
  selector: 'app-add-reservation',
  templateUrl: './add-reservation.component.html',
  styleUrls: ['./add-reservation.component.scss']
})

export class AddReservationComponent {
  displayedColumns = [
    'select',
    'onboarding_date',
    'projectName',
    'externalId',
    'countryCode',
    'fuelCode',
    'status',

  ];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  dataSource: MatTableDataSource<any>;
  data: any;
  loginuser: any
  deviceurl: any;
  pageSize: number = 10;
  countrylist: any;
  fuellist: any;
  devicetypelist: any;
  fuellistLoaded: boolean = false;
  devicetypeLoded: boolean = false;
  countrycodeLoded: boolean = false;
  loading: boolean = true;
  selection = new SelectionModel<any>(true, []);
  reservationForm: FormGroup;
  // startmaxDate = new Date();
  // startminDate = new Date();
  endminDate = new Date();
  FilterForm: FormGroup;
  offtaker = ['School', 'HealthFacility', 'Residential', 'Commercial', 'Industrial', 'PublicSector', 'Agriculture']
  frequency = ['hourly', 'daily', 'weekly', 'montly']

  constructor(private authService: AuthbaseService, private router: Router,
    private formBuilder: FormBuilder, private toastrService: ToastrService, private deviceservice: DeviceService) {
    this.loginuser = sessionStorage.getItem('loginuser');
    this.reservationForm = this.formBuilder.group({
      name: [null, Validators.required],
      deviceIds: [Validators.required],
      targetCapacityInMegaWattHour: [null],
      reservationStartDate: [null, Validators.required],
      reservationEndDate: [null, Validators.required],
      continueWithReservationIfOneOrMoreDevicesUnavailableForReservation: [true],
      continueWithReservationIfTargetCapacityIsLessThanDeviceTotalCapacityBetweenDuration: [true],
      authorityToExceed: [true],
      frequency: [null, Validators.required],
      blockchainAddress: [null]
    });
    this.FilterForm = this.formBuilder.group({
      countryCode: [],
      fuelCode: [],
      deviceTypeCode: [],
      capacity: [],
      offTaker: [],
    });
  }
  ngOnInit() {
    this.authService.GetMethod('device/fuel-type').subscribe(
      (data1: any) => {
        // display list in the console
        this.fuellist = data1;
        this.fuellistLoaded = true;
      });
    this.authService.GetMethod('device/device-type').subscribe(
      (data2: any) => {
        // display list in the console
        this.devicetypelist = data2;
        this.devicetypeLoded = true;
      }
    );
    this.authService.GetMethod('countrycode/list').subscribe(
      (data3: any) => {
        // display list in the console
        // console.log(data)
        this.countrylist = data3;
        this.countrycodeLoded = true;
      }
    )
    this.getDeviceListData();
    console.log("myreservation");

    // setTimeout(() => this.DisplayList(), 10000);
    // setTimeout(() => {
    //   this.loading = false;

    //  this.displayList();
    // }, 2000)

  }
  reset() {
    this.FilterForm.reset();
    
    this.getDeviceListData();
    this.selection.clear();
  }

  isAllSelected() {
    console.log("125")
    console.log(this.selection.selected);
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;

    //this.reservationForm.controls['deviceIds'].setValue(this.selection.selected)
    //this.reservationForm.value.deviceIds=this.selection.selected;
    return numSelected === numRows;
  }
  masterToggle() {
    console.log("131")
    this.isAllSelected() ?
      this.selection.clear() :
      this.dataSource.data.forEach(row => this.selection.select(row));
  }
  onEndChangeEvent(event: any) {
    console.log(event);
    // this.startminDate= this.historyAge;
    //this.startmaxDate=this.devicecreateddate;

    this.endminDate = event;
    //this.hidestarttime = true;

  }
  // applyFilter(event: Event) {
  //   console.log(event)
  //   const filterValue = (event.target as HTMLInputElement).value;
  //   this.dataSource.filter = filterValue.trim().toLowerCase();
  //   if (this.dataSource.paginator) {
  //     this.dataSource.paginator.firstPage();
  //   }
  // }

  getDeviceListData() {

    // this.deviceurl = 'device/ungrouped/buyerreservation';

    this.deviceservice.GetUnreserveDevices().subscribe(
      (data) => {
        this.data = data;
        this.displayList();
        //@ts-ignore
      }
    )
  }
  displayList(){
    if (this.fuellistLoaded == true && this.devicetypeLoded == true && this.countrycodeLoded === true) {
      //@ts-ignore
      this.data.forEach(ele => {
        //@ts-ignore
        ele['fuelname'] = this.fuellist.find((fuelType) => fuelType.code === ele.fuelCode,)?.name;
        //@ts-ignore
        ele['devicetypename'] = this.devicetypelist.find(devicetype => devicetype.code == ele.deviceTypeCode)?.name;
        //@ts-ignore
        ele['countryname'] = this.countrylist.find(countrycode => countrycode.alpha3 == ele.countryCode)?.country;
      })
      console.log(this.data)
      this.dataSource = new MatTableDataSource(this.data);
      //console.log(this.dataSource)
      // this.selection= new SelectionModel<any>(true, this.data);
      // this.isAllSelected();
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      this.loading = false;
    }
  }
  applyFilter() {
    // this.data=this.selection.selected;
    console.log(this.FilterForm.value);

    this.deviceservice.getfilterData(this.FilterForm.value).subscribe(
      (data) => {
        // if(this.selection.selected.length>0){
        //   //@ts-ignore
        //   this.selection.selected.forEach(ele=>data.find(ele1 => ele1.id != ele.countryCode)data.unsift(ele))
        // }

        if (this.selection.selected.length > 0) {
          this.selection.selected.forEach((ele) => {
            //@ts-ignore
            if (data.find(
              //@ts-ignore
              (ele1) => ele1.id != ele.id,
            )) {
              console.log(ele);
              //@ts-ignore
              data.unshift(ele);
            }
          });
        }

        this.data = data;
        console.log(this.data)
        //@ts-ignore
        this.data.forEach(ele => {
          //@ts-ignore
          ele['fuelname'] = this.fuellist.find((fuelType) => fuelType.code === ele.fuelCode,)?.name;
          //@ts-ignore
          ele['devicetypename'] = this.devicetypelist.find(devicetype => devicetype.code == ele.deviceTypeCode)?.name;
          //@ts-ignore
          ele['countryname'] = this.countrylist.find(countrycode => countrycode.alpha3 == ele.countryCode)?.country;
        })
        console.log(this.data)
        this.dataSource = new MatTableDataSource(this.data);
        //console.log(this.dataSource)
        // this.selection= new SelectionModel<any>(true, this.data);
        // this.isAllSelected();
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        //@ts-ignore
      }
    )
  }
  onSubmit(): void {
    console.log(this.reservationForm.value)
    // const email = formData.value.email;
    // const password = formData.value.password;
    // const username = formData.value.username;
    //this.auth.post(email, password, username);
    if (this.selection.selected.length > 0) {

      let deviceId: any = []
      this.selection.selected.forEach(ele => {
        deviceId.push(ele.id)
        console.log(deviceId)

      })
      this.reservationForm.controls['deviceIds'].setValue(deviceId)
      this.authService.PostAuth('device-group', this.reservationForm.value).subscribe({
        next: data => {
          console.log(data)
          this.reservationForm.reset();
          this.selection.clear();
          this.getDeviceListData();
          this.toastrService.success('Successfully!!', 'Reservation');
        },
        error: err => {                          //Error callback
          console.error('error caught in component', err)
          this.toastrService.error('error!', err.error.message);
        }
      });

    } else {
      this.toastrService.error('Validation!', 'Please select at least one device');
    }


  }
}
