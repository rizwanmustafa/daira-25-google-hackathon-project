import './App.css'
import SignUp from './components/sign-up/SignUp'
import SignIn from "./components/sign-in/SignIn"
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AuthProvider } from './context/AuthProvider';
import ConsumerHomePage from "./components/consumer-home-page/ConsumerHomePage";
import ProviderHomePage from './components/provider-homepage/ProviderHomePage';

const router = createBrowserRouter([
  {
    path: "/signup",
    element: <SignUp />,
  },
  {
    path: "/signin",
    element: <SignIn />,
  },
  {
    path: "/consumer-home-page",
    element: <ConsumerHomePage />,
  },{
    path: "/provider-home-page",
    element: <ProviderHomePage/>,
  }

]);

function App() {

  return (
    <AuthProvider>
    <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
