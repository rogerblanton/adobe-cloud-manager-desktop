import VueRouter, { Route } from 'vue-router'
import CloudManagerApi, { CloudManagerApiInstance } from "./app/client/wrapper/CloudManagerApi";
import { AxiosResponse } from 'axios';
import Vue from 'vue';
import ElectronStore from "electron-store";

// declare global variables
declare const electron: any;
declare const Clusterize: any;
declare const electronStore: ElectronStore;

declare global {
  interface Window { 
    keytar: Keytar;
  }
}
declare module '*.vue' {
  import Vue from 'vue';
  export default Vue;
}

declare module 'vue/types/vue' {
  interface Vue {
    $router: VueRouter
    on: FunctionStringCallback
    $showLoadingScreen: Function
    $hideLoadingScreen: Function
    $downloadFile: (url: string) => void
    $sleep: (msec: number) => Promise<any>,
    $openExternalLink: (link: string) => void
    $toast: (text: string, variant?: string, dismissAfter?: number) => HTMLElement;
    $poll: <T> (
      fn: () => Promise<any>,
      onData: (data: T) => void) => void
  }
  interface CoralEvent extends Event {
    detail: {
      selection: HTMLElement
    };
    target: CoralElement
  }
  interface CoralElement extends HTMLElement {
    on(name: string, handler:(e: CoralEvent) => void): void,
    selectedItem: CoralElement
    value: string
    hide: () => void

  }
}

declare interface Keytar {
  getPassword(service: string, account: string): Promise<string | null>
  setPassword(service: string, account: string, password: string): Promise<void>
  deletePassword(service: string, account: string): Promise<boolean>
  findPassword(service: string): Promise<string | null>
  findCredentials(service: string): Promise<Array<{ account: string, password: string}>>
}
