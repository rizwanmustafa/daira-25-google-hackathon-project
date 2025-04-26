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
import { GoogleIcon, FacebookIcon, SitemarkIcon } from './components/CustomIcons';

type UserType = 'customer' | 'provider';

type SignUpValues = {
  userType: UserType;
  name: string;
  email: string;
  password: string;
  phone: string;
  street: string;
  city: string;
  zipcode: string;
  allowExtraEmails: boolean;
};

type SignUpErrors = Partial<Record<keyof SignUpValues, string>>;

type MultiStepSignUpProps = { disableCustomTheme?: boolean };

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
  const [step, setStep] = React.useState<number>(1);
  const [values, setValues] = React.useState<SignUpValues>({
    userType: 'customer', // Default to customer
    name: '',
    email: '',
    password: '',
    phone: '',
    street: '',
    city: '',
    zipcode: '',
    allowExtraEmails: false,
  });
  const [errors, setErrors] = React.useState<SignUpErrors>({});

  const handleChange = <K extends keyof SignUpValues>(field: K) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    let value: any;
    
    if (field === 'allowExtraEmails') {
      value = e.target.checked;
    } else if (field === 'userType') {
      value = e.target.value as UserType;
    } else {
      value = e.target.value;
      
      // For zipcode field, only allow numeric input
      if (field === 'zipcode') {
        value = value.replace(/\D/g, ''); // Remove non-numeric characters
      }
    }
    
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (): boolean => {
    const newErrors: SignUpErrors = {};

    if (step === 1) {
      if (!values.userType) newErrors.userType = 'Please select an account type.';
      if (!values.name) newErrors.name = 'Name is required.';
      if (!values.email || !/\S+@\S+\.\S+/.test(values.email))
        newErrors.email = 'Please enter a valid email address.';
      if (!values.password || values.password.length < 6)
        newErrors.password = 'Password must be at least 6 characters.';
    }

    if (step === 2) {
      if (!values.phone || !/^03\d{9}$/.test(values.phone))
        newErrors.phone = 'Phone must start with 03 and be 11 digits.';
    }

    if (step === 3) {
      if (!values.street) newErrors.street = 'Street is required.';
      if (!values.city) newErrors.city = 'City is required.';
      if (!values.zipcode) {
        newErrors.zipcode = 'Zip code is required.';
      } else if (!/^\d+$/.test(values.zipcode)) {
        newErrors.zipcode = 'Zip code must contain only numbers.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) setStep((prev) => prev + 1);
  };

  const handleBack = () => setStep((prev) => prev - 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep()) {
      console.log('Submitting data:', values);
      // Submit logic here
    }
  };

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <ColorModeSelect sx={{ position: 'fixed', top: '1rem', right: '1rem' }} />
      <SignUpContainer direction="column" justifyContent="center">
        <Card variant="outlined">
          <SitemarkIcon />
          <Typography component="h1" variant="h4">
            Sign up
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {step === 1 && (
              <>
                <FormControl>
                  <FormLabel id="user-type-label" sx={{ textAlign: 'center' }}>I am a:</FormLabel>
                  <RadioGroup
                    row
                    aria-labelledby="user-type-label"
                    name="userType"
                    value={values.userType}
                    onChange={handleChange('userType')}
                    sx={{ justifyContent: 'center' }}
                  >
                    <FormControlLabel value="customer" control={<Radio />} label="Customer" />
                    <FormControlLabel value="provider" control={<Radio />} label="Provider" />
                  </RadioGroup>
                </FormControl>
                
                <FormControl>
                  <FormLabel htmlFor="name">Full name</FormLabel>
                  <TextField
                    id="name"
                    name="name"
                    required
                    fullWidth
                    value={values.name}
                    onChange={handleChange('name')}
                    error={Boolean(errors.name)}
                    helperText={errors.name}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel htmlFor="email">Email</FormLabel>
                  <TextField
                    id="email"
                    name="email"
                    required
                    fullWidth
                    value={values.email}
                    onChange={handleChange('email')}
                    error={Boolean(errors.email)}
                    helperText={errors.email}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel htmlFor="password">Password</FormLabel>
                  <TextField
                    id="password"
                    name="password"
                    type="password"
                    required
                    fullWidth
                    value={values.password}
                    onChange={handleChange('password')}
                    error={Boolean(errors.password)}
                    helperText={errors.password}
                  />
                </FormControl>
                <Button fullWidth variant="contained" onClick={handleNext}>
                  Next
                </Button>
                <Divider>
                  <Typography>or</Typography>
                </Divider>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<GoogleIcon />}
                  onClick={() => alert('Sign up with Google')}
                >
                  Sign up with Google
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<FacebookIcon />}
                  onClick={() => alert('Sign up with Facebook')}
                >
                  Sign up with Facebook
                </Button>
                <Typography align="center">
                  Already have an account?{' '}
                  <Link href="/signin/">Sign in</Link>
                </Typography>
              </>
            )}

            {step === 2 && (
              <>
                <FormControl>
                  <FormLabel htmlFor="phone">Mobile Number</FormLabel>
                  <TextField
                    id="phone"
                    name="phone"
                    required
                    fullWidth
                    value={values.phone}
                    onChange={handleChange('phone')}
                    error={Boolean(errors.phone)}
                    helperText={errors.phone}
                  />
                </FormControl>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={handleBack}>Back</Button>
                  <Button variant="contained" onClick={handleNext}>
                    Next
                  </Button>
                </Box>
              </>
            )}

            {step === 3 && (
              <>
                <Typography variant="h6">Address</Typography>
                <FormControl>
                  <FormLabel htmlFor="street">Street</FormLabel>
                  <TextField
                    id="street"
                    name="street"
                    required
                    fullWidth
                    value={values.street}
                    onChange={handleChange('street')}
                    error={Boolean(errors.street)}
                    helperText={errors.street}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel htmlFor="city">City</FormLabel>
                  <TextField
                    id="city"
                    name="city"
                    required
                    fullWidth
                    value={values.city}
                    onChange={handleChange('city')}
                    error={Boolean(errors.city)}
                    helperText={errors.city}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel htmlFor="zipcode">Zip Code</FormLabel>
                  <TextField
                    id="zipcode"
                    name="zipcode"
                    required
                    fullWidth
                    type="text"
                    inputProps={{ 
                      inputMode: 'numeric',
                      pattern: '[0-9]*' 
                    }}
                    value={values.zipcode}
                    onChange={handleChange('zipcode')}
                    error={Boolean(errors.zipcode)}
                    helperText={errors.zipcode}
                  />
                </FormControl>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={values.allowExtraEmails}
                      onChange={handleChange('allowExtraEmails')}
                    />
                  }
                  label="I want to receive updates via email."
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={handleBack}>Back</Button>
                  <Button variant="contained" onClick={handleNext}>
                    Next
                  </Button>
                </Box>
              </>
            )}

            {step === 4 && (
              <>
                <Typography variant="h6">Review your information</Typography>
                <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                  <Typography><strong>Account Type:</strong> {values.userType === 'customer' ? 'Customer' : 'Provider'}</Typography>
                  <Typography><strong>Name:</strong> {values.name}</Typography>
                  <Typography><strong>Email:</strong> {values.email}</Typography>
                  <Typography><strong>Phone:</strong> {values.phone}</Typography>
                  <Typography><strong>Street:</strong> {values.street}</Typography>
                  <Typography><strong>City:</strong> {values.city}</Typography>
                  <Typography><strong>Zip Code:</strong> {values.zipcode}</Typography>
                  <Typography><strong>Receive updates:</strong> {values.allowExtraEmails ? 'Yes' : 'No'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={handleBack}>Back</Button>
                  <Button type="submit" variant="contained">
                    Submit
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </Card>
      </SignUpContainer>
    </AppTheme>
  );
};

export default MultiStepSignUp;