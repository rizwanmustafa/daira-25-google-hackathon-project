// src/components/MultiStepSignUp.tsx
import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
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
  allowExtraEmails: boolean;
  provider: string;
}

type SignUpErrors = Partial<Record<keyof SignUpValues, string>>;

interface MultiStepSignUpProps {
  disableCustomTheme?: boolean;
}

const Card = styled(MuiCard)(({ theme }) => ({
  /* ... your styles ... */
}));

const SignUpContainer = styled(Stack)(({ theme }) => ({
  /* ... your styles ... */
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
    allowExtraEmails: false,
    provider: '',
  });
  const [errors, setErrors] = React.useState<SignUpErrors>({});

  // Generic onChange
  const handleChange = <K extends keyof SignUpValues>(field: K) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value =
      field === 'allowExtraEmails'
        ? e.target.checked
        : field === 'zipcode'
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

      setValues((prev) => ({
        ...prev,
        name: user.displayName || '',
        email: user.email || '',
        password: '',
        provider: isGoogle ? 'google' : '',
      }));
      setStep(2);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    const res = await fetch('http://localhost:5000/createUser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
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
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={values.allowExtraEmails}
                      onChange={handleChange('allowExtraEmails')}
                    />
                  }
                  label="Receive promotional emails"
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
