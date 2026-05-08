import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import 'core-js'

import App from './App'
import store from './store'

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>,
)

// Destrói qualquer Service Worker "fantasma" do aplicativo antigo (quiz-app)
// Isso resolve o erro vermelho do sw.js e do chrome-extension no console
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister()
    }
  }).catch((err) => console.log('Service Worker cleanup failed: ', err))
}
