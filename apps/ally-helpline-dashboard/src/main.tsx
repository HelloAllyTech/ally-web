import { createRoot } from "react-dom/client";
import App from "./App.tsx";

import { store } from './store/store';
import { Provider } from 'react-redux'
import "./index.css";

createRoot(document.getElementById("root")!).render(<Provider store={store}><App /></Provider>);
