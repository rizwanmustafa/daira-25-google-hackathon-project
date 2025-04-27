import * as React from 'react';
import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import { styled } from '@mui/material/styles';
import AppTheme from '../shared-theme/AppTheme';
import ColorModeSelect from '../shared-theme/ColorModeSelect';
import { SitemarkIcon } from '../sign-in/components/CustomIcons';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import ApiRoutes from '../../api-constants';
import { useAuth } from '../../context/AuthProvider';

// Types based on the FastAPI models
interface Address {
  street: string;
  city: string;
  zipCode: string;
}

interface Item {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  description?: string;
  providerId: string;
  availableStock: number;
  generalItemId?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  userId: string;
  providerId: string;
  items: OrderItem[];
  totalPrice: number;
  status: string;
  deliveryAddress: Address;
  scheduledDeliveryTime?: string;
  createdAt: string;
  updatedAt: string;
}

interface GeneralItem {
  id: string;
  name: string;
  category: string;
  brands: string[];
  defaultImageUrl?: string;
  description?: string;
}

// Styled components
const Container = styled(Stack)(({ theme }) => ({
  minHeight: '100vh',
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

const Card = styled(MuiCard)(({ theme }) => ({
  width: '100%',
  padding: theme.spacing(3),
  margin: 'auto',
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
  ...theme.applyStyles('dark', {
    boxShadow:
      'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
  }),
}));

const FilterCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  [theme.breakpoints.up('md')]: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`provider-tabpanel-${index}`}
      aria-labelledby={`provider-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface ProviderHomePageProps {
  disableCustomTheme?: boolean;
}

const ProviderHomePage: React.FC<ProviderHomePageProps> = (props) => {
  // State
  const [tabValue, setTabValue] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [generalItems, setGeneralItems] = useState<GeneralItem[]>([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Filtering
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState<string>('all');
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  // Empty item template
  const emptyItem: Omit<Item, 'id'> = {
    name: '',
    category: '',
    brand: '',
    price: 0,
    providerId: '',
    availableStock: 0,
    description: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const auth = useAuth();

  // Mock data for display purposes
  useEffect(() => {
    // In a real app, this would be an API call
    // const mockItems: Item[] = [
    //   { 
    //     id: '1', 
    //     name: 'Organic Apples', 
    //     category: 'Fruits', 
    //     brand: 'Green Farms', 
    //     price: 2.99, 
    //     providerId: 'provider1', 
    //     availableStock: 50,
    //     description: 'Fresh organic apples',
    //     createdAt: '2025-04-20T10:30:00Z',
    //     updatedAt: '2025-04-20T10:30:00Z'
    //   },
    //   { 
    //     id: '2', 
    //     name: 'Whole Wheat Bread', 
    //     category: 'Bakery', 
    //     brand: 'Healthy Bakers', 
    //     price: 3.49, 
    //     providerId: 'provider1', 
    //     availableStock: 20,
    //     description: 'Freshly baked whole wheat bread',
    //     createdAt: '2025-04-19T09:15:00Z',
    //     updatedAt: '2025-04-19T09:15:00Z'
    //   },
    //   { 
    //     id: '3', 
    //     name: 'Milk 1L', 
    //     category: 'Dairy', 
    //     brand: 'Farm Fresh', 
    //     price: 1.99, 
    //     providerId: 'provider1', 
    //     availableStock: 30,
    //     description: 'Fresh dairy milk',
    //     createdAt: '2025-04-18T14:20:00Z',
    //     updatedAt: '2025-04-18T14:20:00Z'
    //   },
    //   { 
    //     id: '4', 
    //     name: 'Chicken Breast', 
    //     category: 'Meat', 
    //     brand: 'Premium Poultry', 
    //     price: 7.99, 
    //     providerId: 'provider1', 
    //     availableStock: 15,
    //     description: 'Fresh boneless chicken breast',
    //     createdAt: '2025-04-17T11:45:00Z',
    //     updatedAt: '2025-04-17T11:45:00Z'
    //   },
    //   { 
    //     id: '5', 
    //     name: 'Spinach', 
    //     category: 'Vegetables', 
    //     brand: 'Green Farms', 
    //     price: 2.49, 
    //     providerId: 'provider1', 
    //     availableStock: 25,
    //     description: 'Fresh organic spinach',
    //     createdAt: '2025-04-16T16:30:00Z',
    //     updatedAt: '2025-04-16T16:30:00Z'
    //   },
    // ];


    // fetch()

    const searchParams = new URLSearchParams();
    console.log(auth);
    console.log(auth.user);
    // auth.user?.uid

    searchParams.append('providerId', auth.user?.uid || '');

    const itemsReq = fetch(ApiRoutes.getItems + "?" +  searchParams.toString(), {
      mode: 'cors',
      method: 'GET',
      headers: { Authorization: `Bearer ${auth.idToken}` },
    });

    itemsReq.then((res) => {
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      return res.json();
    }
    ).then((data) => {
      console.log(data);
      setItems(data??[]);
    }).catch((error) => {
      console.error('There was a problem with the fetch operation:', error);
    });


    const ordersReq = fetch(ApiRoutes.getOrders + "?" + searchParams.toString(), {
      mode: 'cors',
      method: 'GET',
      headers: { Authorization: `Bearer ${auth.idToken}` },
    });

    ordersReq.then((res) => {
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      return res.json();
    }
    ).then((data) => {
      console.log(data);
      setOrders(data ?? []);
    }).catch((error) => {
      console.error('There was a problem with the fetch operation:', error);
    });


    const generalItemsReq = fetch(ApiRoutes.getGeneralItems, {
      mode: 'cors',
      method: 'GET',
      headers: { Authorization: `Bearer ${auth.idToken}` },
    });
    generalItemsReq.then((res) => {
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      return res.json();
    }
    ).then((data) => {
      console.log(data);
      setGeneralItems(data ?? []);
    }).catch((error) => {
      console.error('There was a problem with the fetch operation:', error);
    });

    // const mockOrders: Order[] = [
    //   {
    //     id: '1',
    //     userId: 'user1',
    //     providerId: 'provider1',
    //     items: [
    //       { itemId: '1', name: 'Organic Apples', quantity: 2, price: 2.99 },
    //       { itemId: '3', name: 'Milk 1L', quantity: 1, price: 1.99 }
    //     ],
    //     totalPrice: 7.97,
    //     status: 'pending',
    //     deliveryAddress: {
    //       street: '123 Main St',
    //       city: 'Cityville',
    //       zipCode: '12345'
    //     },
    //     createdAt: '2025-04-26T09:30:00Z',
    //     updatedAt: '2025-04-26T09:30:00Z'
    //   },
    //   {
    //     id: '2',
    //     userId: 'user2',
    //     providerId: 'provider1',
    //     items: [
    //       { itemId: '2', name: 'Whole Wheat Bread', quantity: 1, price: 3.49 },
    //       { itemId: '4', name: 'Chicken Breast', quantity: 2, price: 7.99 }
    //     ],
    //     totalPrice: 19.47,
    //     status: 'confirmed',
    //     deliveryAddress: {
    //       street: '456 Oak Ave',
    //       city: 'Townsburg',
    //       zipCode: '67890'
    //     },
    //     scheduledDeliveryTime: '2025-04-27T14:00:00Z',
    //     createdAt: '2025-04-25T15:45:00Z',
    //     updatedAt: '2025-04-25T16:20:00Z'
    //   },
    //   {
    //     id: '3',
    //     userId: 'user3',
    //     providerId: 'provider1',
    //     items: [
    //       { itemId: '5', name: 'Spinach', quantity: 1, price: 2.49 },
    //       { itemId: '1', name: 'Organic Apples', quantity: 3, price: 2.99 }
    //     ],
    //     totalPrice: 11.46,
    //     status: 'delivered',
    //     deliveryAddress: {
    //       street: '789 Pine Ln',
    //       city: 'Villageton',
    //       zipCode: '54321'
    //     },
    //     scheduledDeliveryTime: '2025-04-26T11:00:00Z',
    //     createdAt: '2025-04-24T10:15:00Z',
    //     updatedAt: '2025-04-26T11:30:00Z'
    //   },
    // ];


    // const mockGeneralItems: GeneralItem[] = [
    //   {
    //     id: '1',
    //     name: 'Apples',
    //     category: 'Fruits',
    //     brands: ['Green Farms', 'Nature\'s Best', 'Organic Valley'],
    //     description: 'Fresh apples',
    //   },
    //   {
    //     id: '2',
    //     name: 'Bread',
    //     category: 'Bakery',
    //     brands: ['Healthy Bakers', 'Daily Bread', 'Fresh Loaf'],
    //     description: 'Bread varieties',
    //   },
    // ];

    // setItems(itemsRes);
    // setOrders(mockOrders);
    // setGeneralItems(mockGeneralItems);
  }, []);

  // Filtered items and orders
  const filteredOrders = orders.filter(order => {
    const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
    const matchesSearch = orderSearchQuery === '' ||
      order.id.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      order.items.some(item => item.name.toLowerCase().includes(orderSearchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const filteredItems = items.filter(item => {
    const matchesCategory = itemCategoryFilter === 'all' || item.category === itemCategoryFilter;
    const matchesSearch = itemSearchQuery === '' ||
      item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(itemSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get unique categories for filter
  const categories = Array.from(new Set(items.map(item => item.category)));

  // Handlers
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0); // Reset pagination on tab change
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setIsNewItem(false);
    setDialogOpen(true);
  };

  const handleNewItem = () => {
    setEditingItem({ ...emptyItem } as Item);
    setIsNewItem(true);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;

    if (isNewItem) {
      // In a real app, this would be an API call to create
      const newItem = {
        ...editingItem,
        id: `temp-${Date.now()}`,
        providerId: 'provider1', // This would come from authentication
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setItems(prev => [...prev, newItem]);
    } else {
      // In a real app, this would be an API call to update
      setItems(prev => prev.map(item =>
        item.id === editingItem.id ? { ...editingItem, updatedAt: new Date().toISOString() } : item
      ));
    }

    handleCloseDialog();
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: string) => {
    // In a real app, this would be an API call
    setOrders(prev => prev.map(order =>
      order.id === orderId ? { ...order, status: newStatus, updatedAt: new Date().toISOString() } : order
    ));
  };

  const handleItemInputChange = (field: keyof Item, value: any) => {
    if (editingItem) {
      setEditingItem({ ...editingItem, [field]: value });
    }
  };

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <ColorModeSelect sx={{ position: 'fixed', top: 8, right: 8 }} />
      <Container>
        <Box sx={{ maxWidth: 1200, width: '100%', mx: 'auto' }}>
          <Card>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <SitemarkIcon />
              <Typography variant="h4" sx={{ ml: 1 }}>Provider Dashboard</Typography>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="provider tabs">
                <Tab label="Orders" id="provider-tab-0" aria-controls="provider-tabpanel-0" />
                <Tab label="My Products" id="provider-tab-1" aria-controls="provider-tabpanel-1" />
              </Tabs>
            </Box>

            {/* Orders Tab */}
            <TabPanel value={tabValue} index={0}>
              <FilterCard>
                <TextField
                  label="Search Orders"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ maxWidth: { md: 300 } }}
                />
                <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
                  <InputLabel id="status-filter-label">Status</InputLabel>
                  <Select
                    labelId="status-filter-label"
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="confirmed">Confirmed</MenuItem>
                    <MenuItem value="shipped">Shipped</MenuItem>
                    <MenuItem value="delivered">Delivered</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                    {filteredOrders.length} orders
                  </Typography>
                </Box>
              </FilterCard>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order ID</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Items</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredOrders
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>{order.id}</TableCell>
                          <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              {order.items.map((item, idx) => (
                                <Typography key={idx} variant="body2">
                                  {item.quantity}x {item.name}
                                </Typography>
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell align="right">${order.totalPrice.toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip
                              label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              color={
                                order.status === 'delivered' ? 'success' :
                                  order.status === 'confirmed' ? 'primary' :
                                    order.status === 'pending' ? 'warning' :
                                      order.status === 'cancelled' ? 'error' : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                              <Select
                                value={order.status}
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              >
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="confirmed">Confirmed</MenuItem>
                                <MenuItem value="shipped">Shipped</MenuItem>
                                <MenuItem value="delivered">Delivered</MenuItem>
                                <MenuItem value="cancelled">Cancelled</MenuItem>
                              </Select>
                            </FormControl>
                          </TableCell>
                        </TableRow>
                      ))}
                    {filteredOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" sx={{ py: 2 }}>
                            No orders found matching the current filters.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={filteredOrders.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </TableContainer>
            </TabPanel>

            {/* Products Tab */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleNewItem}
                >
                  Add New Product
                </Button>
              </Box>

              <FilterCard>
                <TextField
                  label="Search Products"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ maxWidth: { md: 300 } }}
                />
                <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
                  <InputLabel id="category-filter-label">Category</InputLabel>
                  <Select
                    labelId="category-filter-label"
                    value={itemCategoryFilter}
                    onChange={(e) => setItemCategoryFilter(e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                    {filteredItems.length} products
                  </Typography>
                </Box>
              </FilterCard>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Brand</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Stock</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredItems
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{item.brand}</TableCell>
                          <TableCell align="right">${item.price.toFixed(2)}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={item.availableStock}
                              color={
                                item.availableStock > 20 ? 'success' :
                                  item.availableStock > 5 ? 'warning' :
                                    'error'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEditItem(item)}
                            >
                              <EditIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    {filteredItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" sx={{ py: 2 }}>
                            No products found matching the current filters.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={filteredItems.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </TableContainer>
            </TabPanel>
          </Card>
        </Box>
      </Container>

      {/* Item Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isNewItem ? 'Add New Product' : 'Edit Product'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 1 }}>
            <TextField
              label="Product Name"
              fullWidth
              value={editingItem?.name || ''}
              onChange={(e) => handleItemInputChange('name', e.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel id="category-select-label">Category</InputLabel>
              <Select
                labelId="category-select-label"
                value={editingItem?.category || ''}
                label="Category"
                onChange={(e) => handleItemInputChange('category', e.target.value)}
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Brand"
              fullWidth
              value={editingItem?.brand || ''}
              onChange={(e) => handleItemInputChange('brand', e.target.value)}
            />

            <TextField
              label="Price"
              fullWidth
              type="number"
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
              value={editingItem?.price || ''}
              onChange={(e) => handleItemInputChange('price', parseFloat(e.target.value))}
            />

            <TextField
              label="Available Stock"
              fullWidth
              type="number"
              value={editingItem?.availableStock || ''}
              onChange={(e) => handleItemInputChange('availableStock', parseInt(e.target.value))}
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={editingItem?.description || ''}
              onChange={(e) => handleItemInputChange('description', e.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel id="general-item-select-label">General Item</InputLabel>
              <Select
                labelId="general-item-select-label"
                value={editingItem?.generalItemId || ''}
                label="General Item"
                onChange={(e) => handleItemInputChange('generalItemId', e.target.value)}
              >
                <MenuItem value="">None</MenuItem>
                {generalItems.map((item) => (
                  <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Image URL"
              fullWidth
              value={editingItem?.imageUrl || ''}
              onChange={(e) => handleItemInputChange('imageUrl', e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleUpdateItem} variant="contained" color="primary">
            {isNewItem ? 'Add Product' : 'Update Product'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppTheme>
  );
};

export default ProviderHomePage;