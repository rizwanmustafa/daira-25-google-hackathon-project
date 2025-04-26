// src/components/MultiStepSignUp.tsx
import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import Link from '@mui/material/Link';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import { styled } from '@mui/material/styles';
import AppTheme from '../shared-theme/AppTheme';
import ColorModeSelect from '../shared-theme/ColorModeSelect';
import { GoogleIcon, SitemarkIcon } from './components/CustomIcons';

import { signInWithPopup, User } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import  ApiRoute  from "../../api-constants";

type UserType = 'customer' | 'provider';

interface SignUpValues {
  userType: UserType;
  name: string;
  email: string;
  password: string;
  phone: string;
  street: string;
  city: string;
  zipcode: string;
  provider: string;
  idToken: string;
}

type SignUpErrors = Partial<Record<keyof SignUpValues, string>>;

interface MultiStepSignUpProps {
  disableCustomTheme?: boolean;
}

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: theme.spacing(3),
  gap: theme.spacing(2),
  margin: 'auto',
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
  [theme.breakpoints.up('sm')]: {
    width: '450px',
  },
  ...theme.applyStyles('dark', {
    boxShadow:
      'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
  }),
}));

const SignUpContainer = styled(Stack)(({ theme }) => ({
  height: '100vh',
  maxHeight: '100vh',
  overflowY: 'auto',
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(3),
  },
  '&::before': {
    content: '""',
    display: 'block',
    position: 'absolute',
    zIndex: -1,
    inset: 0,
    backgroundImage:
      'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
    backgroundRepeat: 'no-repeat',
    ...theme.applyStyles('dark', {
      backgroundImage:
        'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
    }),
  },
}));

const MultiStepSignUp: React.FC<MultiStepSignUpProps> = (props) => {
  const [step, setStep] = React.useState(1);
  const [values, setValues] = React.useState<SignUpValues>({
    userType: 'customer',
    name: '',
    email: '',
    password: '',
    phone: '',
    street: '',
    city: '',
    zipcode: '',
    provider: '',
    idToken: ''
  });
  const [errors, setErrors] = React.useState<SignUpErrors>({});

  // Generic onChange
  const handleChange = <K extends keyof SignUpValues>(field: K) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value =
        field === 'zipcode'
        ? e.target.value.replace(/\D/g, '')
        : (e.target.value as SignUpValues[K]);

    setValues((prev) => ({ ...prev, [field]: value }));
  };

  // Step validation
  const validateStep = (): boolean => {
    const newErrors: SignUpErrors = {};

    if (step === 1) {
      if (!values.name) newErrors.name = 'Name is required.';
      if (!values.email || !/\S+@\S+\.\S+/.test(values.email))
        newErrors.email = 'Valid email required.';
      if (!values.password || values.password.length < 6)
        newErrors.password = 'Min 6 characters.';
    }

    if (step === 2) {
      if (!values.userType) newErrors.userType = 'Select account type.';
    }

    if (step === 3) {
      if (!values.phone || !/^03\d{9}$/.test(values.phone))
        newErrors.phone = 'Must start with 03 and be 11 digits.';
    }

    if (step === 4) {
      if (!values.street) newErrors.street = 'Street is required.';
      if (!values.city) newErrors.city = 'City is required.';
      if (!values.zipcode) newErrors.zipcode = 'Valid zip required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) setStep((s) => s + 1);
  };
  const handleBack = () => setStep((s) => s - 1);

  // Google signup → auto-fill + go to step 2
  const handleGoogleSignUp = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const isGoogle = result.providerId === 'google.com';
      const idToken = await user.getIdToken();

      setValues((prev) => ({
        ...prev,
        name: user.displayName || '',
        email: user.email || '',
        password: '',
        provider: isGoogle ? 'google' : '',
        idToken: idToken,
      }));
      setStep(2);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;


    const newObject = {
      email: values.email,
      password: values.password,
      name: values.name,
      userType: values.userType,
      phoneNumber: values.phone, 
      address: {
        street: values.street,
        city: values.city,
        zipCode: values.zipcode,
      },
      provider: values.provider,
      idToken: values.idToken,
    }

    console.log(values);
    const res = await fetch(ApiRoute.createUser, {
      mode: 'cors',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(newObject),
    });

    const data = await res.json();
    if (!res.ok) {
      setErrors((prev) => ({ ...prev, server: data.message }));
      return;
    }
    // Handle successful signup
    console.log('User created successfully:', data);
    // Redirect or show success message
    // window.location.href = '/signin';
    // or use a router to navigate
    // router.push('/signin');


    // handle response...
  };

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <ColorModeSelect sx={{ position: 'fixed', top: 8, right: 8 }} />
      <SignUpContainer direction="column" justifyContent="center">
        <Card variant="outlined">
          <SitemarkIcon />
          <Typography variant="h4">Sign up</Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {step === 1 && (
              <>
                <TextField
                  label="Full Name"
                  value={values.name}
                  onChange={handleChange('name')}
                  error={!!errors.name}
                  helperText={errors.name}
                  fullWidth
                  required
                />
                <TextField
                  label="Email"
                  value={values.email}
                  onChange={handleChange('email')}
                  error={!!errors.email}
                  helperText={errors.email}
                  fullWidth
                  required
                />
                <TextField
                  type="password"
                  label="Password"
                  value={values.password}
                  onChange={handleChange('password')}
                  error={!!errors.password}
                  helperText={errors.password}
                  fullWidth
                  required
                />
                <Button fullWidth variant="contained" onClick={handleNext}>
                  Next
                </Button>
                <Divider>or</Divider>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<GoogleIcon />}
                  onClick={handleGoogleSignUp}
                >
                  Continue with Google
                </Button>
                <Typography align="center">
                  Already have an account? <Link href="/signin">Sign in</Link>
                </Typography>
              </>
            )}

            {step === 2 && (
              <>
                <FormControl>
                  <FormLabel>I am a:</FormLabel>
                  <RadioGroup
                    row
                    value={values.userType}
                    onChange={handleChange('userType')}
                  >
                    <FormControlLabel
                      value="customer"
                      control={<Radio />}
                      label="Customer"
                    />
                    <FormControlLabel
                      value="provider"
                      control={<Radio />}
                      label="Provider"
                    />
                  </RadioGroup>
                </FormControl>
                <Button fullWidth variant="contained" onClick={handleNext}>
                  Next
                </Button>
                <Button onClick={handleBack}>Back</Button>
              </>
            )}

            {step === 3 && (
              <>
                <TextField
                  label="Mobile (03xxxxxxxxx)"
                  value={values.phone}
                  onChange={handleChange('phone')}
                  error={!!errors.phone}
                  helperText={errors.phone}
                  fullWidth
                  required
                />
                <Button fullWidth variant="contained" onClick={handleNext}>
                  Next
                </Button>
                <Button onClick={handleBack}>Back</Button>
              </>
            )}

            {step === 4 && (
              <>
                <TextField
                  label="Street"
                  value={values.street}
                  onChange={handleChange('street')}
                  error={!!errors.street}
                  helperText={errors.street}
                  fullWidth
                  required
                />
                <TextField
                  label="City"
                  value={values.city}
                  onChange={handleChange('city')}
                  error={!!errors.city}
                  helperText={errors.city}
                  fullWidth
                  required
                />
                <TextField
                  label="Zip Code"
                  value={values.zipcode}
                  onChange={handleChange('zipcode')}
                  error={!!errors.zipcode}
                  helperText={errors.zipcode}
                  fullWidth
                  required
                />
                <Button fullWidth type="submit" variant="contained">
                  Submit
                </Button>
                <Button onClick={handleBack}>Back</Button>
              </>
            )}
          </Box>
        </Card>
      </SignUpContainer>
    </AppTheme>
  );
};

export default MultiStepSignUp;
