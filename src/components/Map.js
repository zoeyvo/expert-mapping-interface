

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

    render() {
        return html`
            <leaflet-map latitude="37.7749" longitude="-122.4194" defaultZoom="2"></leaflet-map>
        `;
    }
}

customElements.define("map-component", MapComponent);
