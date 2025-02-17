import { LitElement, html, css } from 'lit';
import './components/Map.js';

class AppRoot extends LitElement {
    static styles = css`
        h1 {
            text-align: center;
            color: #333;
        }
    `;

    render() {
        return html`
            <h1>Aggie Experts Interactive Map</h1>
            <map-component></map-component>
        `;
    }
}

customElements.define('app-root', AppRoot);