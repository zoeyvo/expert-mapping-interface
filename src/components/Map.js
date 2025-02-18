

import { LitElement, html, css } from "lit";
import '@inventage/leaflet-map'; // Import the leaflet-map web component

class MapComponent extends LitElement {
    static styles = css`
        :host {
            display: block;
            width: 100%;
            height: 100%; /* Make the map take the full height of its container */
        }

        leaflet-map {
            width: 100%;
            height: 100%; /* Ensure the map takes full height within the component */
            --leaflet-map-min-height: 63vh; 
        }
    `;
// const latitude = 47.3902;
// const longitude = 8.5158;
// const radius = 0;
// const defaultZoom = 2;
// const points = [
// {
//     id: 3284823890,
//     latitude: 47.3901151,
//     longitude: 8.5151409,
//     title: "Villaggio",
//     url: "https://www.google.com",
//   },
//   {
//     id: 651504006,
//     latitude: 47.3902919,
//     longitude: 8.5172402,
//     title: "Angkor",
//     url: "https://www.google.com",
//   },
//   {
//     id: 3284823880,
//     latitude: 47.3905062,
//     longitude: 8.5174073,
//   },
//   {
//     id: 3297129090,
//     latitude: 47.3891608,
//     longitude: 8.5166309,
//     title: "novotelcafe",
//   },
//   {
//     id: 305586751,
//     latitude: 47.3900555,
//     longitude: 8.5179098,
//     title: "Toscano im Puls 5",
//   },
//   {
//     id: 2069791719,
//     latitude: 47.3891509,
//     longitude: 8.5177829,
//     title: "Aubrey",
//     url: "https://www.google.com",
//   },
// ];
    render() {
        return html`
        <leaflet-map latitude="37.7749" longitude="-122.4194" defaultZoom="2" ></leaflet-map>
        `;
    }
}

customElements.define("map-component", MapComponent);
