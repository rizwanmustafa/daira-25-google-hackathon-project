import './App.css'
import SignUp from './components/sign-up/SignUp'
import SignIn from "./components/sign-in/SignIn"
import { createBrowserRouter, RouterProvider } from 'react-router';

const router = createBrowserRouter([
  {
    path: "/signup",
    element: <SignUp />,
  },
  {
    path: "/signin",
    element: <SignIn />,
  }

]);

function App() {

  return (
    <RouterProvider router={router} />
  )
}

export default App
