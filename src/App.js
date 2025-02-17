import { LitElement, html, css } from 'lit';
import './components/Map.js';
import logo from "./aggie-experts-logo-primary.png";
import topImage from "./topImage2.png";

class AppRoot extends LitElement {
    static styles = css`
    .header {
        display: flex;
        align-items: center;
        justify-content: center;
        padding:10px 20px;
        
    }

    .logo {
        height: 40px; /* Make it smaller */
        width: auto; /* Maintain aspect ratio */
        margin-right: 15px;
    }

    h1 {
        color: #022851;
        margin: 0;
        font-size: 1.5rem; /* Adjust font size if needed */
        flex-grow: 1;
    }

  .navbar {
        background-color: #022851; /* Blue color for the navbar */
        width: 100%; /* Make the navbar take up full width */
        padding: 10px 0; /* Adjust padding for the navbar height */
        text-align: center; /* Center content */
        color: white; /* Text color inside navbar */
    }

    .navbar-links {
        display: flex;
        justify-content: flex-start;
        gap: 20px; /* Space between links */
        margin-left:40px;
        margin-top:0px;
        align-items: center;
    }

    .navbar-links a {
        color: white;
        font-size: 1.2rem; /* Adjust font size if needed */
        text-decoration: none; /* Remove underline */
        
    }

       .hero {
        width: 100vw; /* Make the container take up the full viewport width */
        text-align: center; /* Center the image */
        margin-top: 15px;  /* Space between title and hero image */
        overflow: hidden;  /* Prevent the image from overflowing if it's too wide */
        padding:0;
    }

    .top-image {
        width: 100%; /* Make image take up full width */
        height: auto; /* Maintain aspect ratio */
        object-fit: cover; /* Cover the container without stretching the image */
    }

    
`;

    render() {
        return html`
                <div class="header">
                <img src="${logo}" alt="Aggie Experts Logo" class="logo" />
                <h1>Aggie Experts Interactive Map</h1>
            </div>
            <div class="navbar">
                <div class="navbar-links">
                    <a href="https://experts.ucdavis.edu/browse/expert/a">Experts</a>
                    <a href="https://experts.ucdavis.edu/browse/grant/1">Grants</a>
                    <a href="https://experts.ucdavis.edu/browse/award/1">Awards</a>
                </div>
                <div class="hero">
                    <img src="${topImage}" alt="Top Image" class="top-image" /> <!-- Hero image -->
                </div>
                <map-component></map-component>
        `;
    }
}

customElements.define('app-root', AppRoot);