import { Component,OnInit } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-sidemenu',
  templateUrl: './sidemenu.component.html',
  styleUrls: ['./sidemenu.component.scss']
})
export class SidemenuComponent implements OnInit{
  loginuser:any
  constructor(  private router: Router) {
  

   }
   ngOnInit(){
   
    this.loginuser = JSON.parse(sessionStorage.getItem('loginuser')!);
   
   }
  logout(){
  
    sessionStorage.clear();
     this.router.navigate(['/login']);
 
}
}