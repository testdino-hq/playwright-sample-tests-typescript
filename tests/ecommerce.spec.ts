// @ts-check
// `test` and `expect` come from our custom fixtures (TestDino Playwright Skill):
// each test receives a fresh `allPages` Page Object aggregator via dependency
// injection instead of a shared global + beforeEach. See tests/fixtures.ts.
import { test, expect } from './fixtures.js';
import type AllPages from '../pages/AllPages.js';
import dotenv from 'dotenv';
// quiet: --list loads every spec file, so dotenv's "injected env" notice
// would land on stdout and corrupt the JSON that `orchestrate discover` parses.
dotenv.config({ override: true, quiet: true });

async function login(allPages: AllPages, username = process.env.USERNAME, password = process.env.PASSWORD) {
  await allPages.loginPage.clickOnUserProfileIcon();
  await allPages.loginPage.validateSignInPage();
  await allPages.loginPage.login(username, password);
}

async function login1(allPages: AllPages, username = process.env.USERNAME1, password = process.env.PASSWORD) {
  await allPages.loginPage.clickOnUserProfileIcon();
  await allPages.loginPage.validateSignInPage();
  await allPages.loginPage.login(username, password);
}

async function logout(allPages: AllPages) {
  await allPages.loginPage.page.waitForTimeout(2000); // Wait for 2 seconds
  await allPages.loginPage.clickOnUserProfileIcon();
  await allPages.loginPage.clickOnLogoutButton();
}

// Register and sign in as a brand-new user so the test gets a clean account
// (used by flows that mutate account state, e.g. addresses).
async function registerAndLogin(allPages: AllPages) {
  const email = `test+${Date.now()}@test.com`;
  await allPages.loginPage.clickOnUserProfileIcon();
  await allPages.loginPage.validateSignInPage();
  await allPages.loginPage.clickOnSignupLink();
  await allPages.signupPage.assertSignupPage();
  await allPages.signupPage.signup('Test', 'User', email, process.env.PASSWORD);
  await allPages.signupPage.verifySuccessSignUp();
  await allPages.loginPage.validateSignInPage();
  await allPages.loginPage.login(email, process.env.PASSWORD);
  await allPages.loginPage.verifySuccessSignIn();
  return email;
}

test('Verify that user can login and logout successfully', async ({ allPages }) => {
  await login(allPages);
  await logout(allPages);

  // ⚠️ INTENTIONAL FAILURE (1 of 2) — deliberately wrong assertion kept here to
  // demonstrate how failures surface in the report. Delete this line to make the
  // test pass.
  expect('logged-out').toBe('still-logged-in');
});

test('Verify that user can update personal information', async ({ allPages }) => {
  await login(allPages);
  await allPages.userPage.clickOnUserProfileIcon();
  await allPages.userPage.updatePersonalInfo();
  await allPages.userPage.verifyPersonalInfoUpdated();
});

test('Verify that User Can Add, Edit, and Delete Addresses after Logging In', async ({ allPages }) => {
    await registerAndLogin(allPages);

  await test.step('Verify that user is able to add address successfully', async () => {
    await allPages.userPage.clickOnUserProfileIcon();
    await allPages.userPage.clickOnAddressTab();
    await allPages.userPage.clickOnAddAddressButton();
    await allPages.userPage.fillAddressForm();
    await allPages.userPage.verifytheAddressIsAdded();
  });

  await test.step('Verify that user is able to edit address successfully', async () => {
    await allPages.userPage.clickOnEditAddressButton();
    await allPages.userPage.updateAddressForm();
    await allPages.userPage.verifytheUpdatedAddressIsAdded();
  })

  await test.step('Verify that user is able to delete address successfully', async () => {
    await allPages.userPage.clickOnDeleteAddressButton();
  });
});

test('Verify that user can change password successfully', async ({ allPages }) => {
  await test.step('Login with existing password', async () => {
    await login1(allPages);
  });

  await test.step('Change password and verify login with new password', async () => {
    await allPages.userPage.clickOnUserProfileIcon();
    await allPages.userPage.clickOnSecurityButton();
    await allPages.userPage.enterNewPassword();
    await allPages.userPage.enterConfirmNewPassword();
    await allPages.userPage.clickOnUpdatePasswordButton();
    await allPages.userPage.getUpdatePasswordNotification();
  });
  await test.step('Verify login with new password and revert back to original password', async () => {
    // Re-login with new password
    await logout(allPages);
    await allPages.loginPage.login(process.env.USERNAME1, process.env.NEW_PASSWORD);

    // Revert back
    await allPages.userPage.clickOnUserProfileIcon();
    await allPages.userPage.clickOnSecurityButton();
    await allPages.userPage.revertPasswordBackToOriginal();
    await allPages.userPage.getUpdatePasswordNotification();
  })
});

test('Verify that the New User is able to add Addresses in the Address section', async ({ allPages }) => {
  await registerAndLogin(allPages);
  await allPages.userPage.clickOnUserProfileIcon();
  await allPages.userPage.clickOnAddressTab();
  await allPages.userPage.clickOnAddAddressButton();
  await allPages.userPage.checkAddNewAddressMenu();
  await allPages.userPage.fillAddressForm();
});

test('Verify that User Can Complete the Journey from Login to Order Placement', async ({ allPages }) => {
  const productName = 'GoPro HERO10 Black';
  await login(allPages);
  await allPages.inventoryPage.clickOnShopNowButton();
  await allPages.inventoryPage.clickOnAllProductsLink();
  await allPages.inventoryPage.searchProduct(productName);
  await allPages.inventoryPage.verifyProductTitleVisible(productName);
  await allPages.inventoryPage.clickOnAddToCartIcon();

  await allPages.cartPage.clickOnCartIcon();
  await allPages.cartPage.verifyCartItemVisible(productName);
  await allPages.cartPage.clickOnCheckoutButton();
  await allPages.checkoutPage.verifyCheckoutTitle();
  await allPages.checkoutPage.verifyProductInCheckout(productName);
  await allPages.checkoutPage.selectCashOnDelivery();
  await allPages.checkoutPage.verifyCashOnDeliverySelected();
  await allPages.checkoutPage.clickOnPlaceOrder();
  await allPages.checkoutPage.verifyOrderPlacedSuccessfully();
});

test('Verify user can place and cancel an order', async ({ allPages }) => {
  const productName = 'GoPro HERO10 Black';
  const productPriceAndQuantity = '$600 × 1';
  const orderStatusProcessing = 'Processing';
  // Use a fresh account so the order history is clean and the placed order is
  // unambiguously the one we view, cancel and verify.
  const email = `test+${Date.now()}@test.com`;

  await test.step('Register and log in as a fresh user', async () => {
    await allPages.loginPage.clickOnUserProfileIcon();
    await allPages.loginPage.validateSignInPage();
    await allPages.loginPage.clickOnSignupLink();
    await allPages.signupPage.assertSignupPage();
    await allPages.signupPage.signup('Test', 'User', email, process.env.PASSWORD);
    await allPages.signupPage.verifySuccessSignUp();
    await allPages.loginPage.validateSignInPage();
    await allPages.loginPage.login(email, process.env.PASSWORD);
    await allPages.loginPage.verifySuccessSignIn();
  })

  await test.step('Add product to cart and checkout', async () => {
    await allPages.inventoryPage.clickOnAllProductsLink();
    await allPages.inventoryPage.searchProduct(productName);
    await allPages.inventoryPage.verifyProductTitleVisible(productName);
    await allPages.inventoryPage.clickOnAddToCartIcon();
    await allPages.cartPage.clickOnCartIcon();
    await allPages.cartPage.verifyCartItemVisible(productName);
    await allPages.cartPage.clickOnCheckoutButton();
  })

  await test.step('Place order and click on continue shopping', async () => {
    await allPages.checkoutPage.verifyCheckoutTitle();
    await allPages.checkoutPage.fillShippingAddress(
      'Test', email, 'New York', 'New York', '123 Main St', '10001', 'United States'
    );
    await allPages.checkoutPage.clickSaveAddressButton();
    await allPages.checkoutPage.assertAddressAddedToast();
    await allPages.checkoutPage.selectCashOnDelivery();
    await allPages.checkoutPage.clickOnPlaceOrder();
    await allPages.checkoutPage.verifyOrderPlacedSuccessfully();
    await allPages.inventoryPage.clickOnContinueShopping();
  })

  await test.step('Verify order in My Orders', async () => {
    await allPages.loginPage.clickOnUserProfileIcon();
    await allPages.orderPage.clickOnMyOrdersTab();
    await allPages.orderPage.verifyMyOrdersTitle();
    await allPages.orderPage.verifyProductInOrderList(productName);
    await allPages.orderPage.verifyPriceAndQuantityInOrderList(productPriceAndQuantity);
    await allPages.orderPage.verifyOrderStatusInList(orderStatusProcessing, productName);
    await allPages.orderPage.clickViewDetailsForProduct(productName);
    await allPages.orderPage.verifyOrderDetailsTitle();
    await allPages.orderPage.verifyOrderSummary(productName);
  })

  await test.step('Cancel order and verify status is updated to Canceled', async () => {
    // View Details navigated to the order status page, so go back to the list first.
    await allPages.loginPage.clickOnUserProfileIcon();
    await allPages.orderPage.clickOnMyOrdersTab();
    await allPages.orderPage.verifyMyOrdersTitle();
    await allPages.orderPage.clickCancelOrderButton(1);
    await allPages.orderPage.confirmCancellation();
    await allPages.orderPage.verifyCancellationConfirmationMessage();
    // Re-open My Orders so the list refetches and shows the updated status.
    await allPages.loginPage.clickOnUserProfileIcon();
    await allPages.orderPage.clickOnMyOrdersTab();
    await allPages.orderPage.verifyMyOrdersTitle();
    await allPages.orderPage.verifyOrderRemovedAfterCancel(productName);
  })
});

test('Verify that a New User Can Successfully Complete the Journey from Registration to a Single Order Placement', async ({ allPages }) => {
  // fresh test data
  const email = `test+${Date.now()}@test.com`;
  const firstName = 'Test';
  const lastName = 'User';

  let productName: string;
  let productPrice: string;
  let productReviewCount;

  await test.step('Verify that user can register successfully', async () => {
    await allPages.loginPage.clickOnUserProfileIcon();
    await allPages.loginPage.validateSignInPage();
    await allPages.loginPage.clickOnSignupLink();
    await allPages.signupPage.assertSignupPage();
    await allPages.signupPage.signup(firstName, lastName, email, process.env.PASSWORD);
    await allPages.signupPage.verifySuccessSignUp();
  })

  await test.step('Verify that user can login successfully', async () => {
    await allPages.loginPage.validateSignInPage();
    await allPages.loginPage.login(email, process.env.PASSWORD);
    await allPages.loginPage.verifySuccessSignIn();
    await expect(allPages.homePage.getHomeNav()).toBeVisible({ timeout: 30000 });
  })

  await test.step('Navigate to all product and add to wishlist section', async () => {
    await allPages.homePage.clickAllProductsNav();
    await allPages.allProductsPage.assertAllProductsTitle();

    productName = await allPages.allProductsPage.getNthProductName(1);
    productPrice = await allPages.allProductsPage.getNthProductPrice(1);
    productReviewCount = await allPages.allProductsPage.getNthProductReviewCount(1);

    await allPages.allProductsPage.clickNthProductWishlistIcon(1);
    await expect(allPages.allProductsPage.getNthProductWishlistIconCount(1)).toContainText('1');
    await allPages.allProductsPage.clickNthProduct(1);

    await allPages.productDetailsPage.assertProductNameTitle(productName);
    await allPages.productDetailsPage.assertProductPrice(productName, productPrice);
    await allPages.productDetailsPage.assertProductReviewCount(productName, productReviewCount);
    await expect(allPages.allProductsPage.getNthProductWishlistIconCount(1)).toContainText('1');
  })

  await test.step('Add product to cart, add new address and checkout', async () => {
    await allPages.productDetailsPage.clickAddToCartButton();

    await allPages.productDetailsPage.clickCartIcon();
    await allPages.cartPage.assertYourCartTitle();
    await expect(allPages.cartPage.getCartItemName()).toContainText(productName, { timeout: 10000 });
    await expect(allPages.cartPage.getCartItemPrice()).toContainText(productPrice);
    await expect(allPages.cartPage.getCartItemQuantity()).toContainText('1');
    await allPages.cartPage.clickIncreaseQuantityButton();
    await expect(allPages.cartPage.getCartItemQuantity()).toContainText('2');

    const cleanPrice = productPrice.replace(/[₹$,]/g, '');
    const priceValue = parseFloat(cleanPrice) * 2;
    await expect(allPages.cartPage.getTotalValue()).toContainText(
      priceValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    );
    await allPages.cartPage.clickOnCheckoutButton();

    // Fill shipping address and save
    await allPages.checkoutPage.verifyCheckoutTitle();
    await allPages.checkoutPage.fillShippingAddress(
      firstName, email, 'New York', 'New York', '123 Main St', '10001', 'United States'
    );
    await allPages.checkoutPage.clickSaveAddressButton();
    await allPages.checkoutPage.assertAddressAddedToast();

    // COD, verify summary, place order
    await allPages.checkoutPage.selectCashOnDelivery();
    await allPages.checkoutPage.verifyCheckoutTitle();
    await allPages.checkoutPage.assertOrderSummaryTitle();
    await expect(allPages.checkoutPage.getOrderSummaryImage()).toBeVisible();
    await expect(allPages.checkoutPage.getOrderSummaryProductName()).toContainText(productName);
    await allPages.checkoutPage.verifyProductInCheckout(productName);
    await expect(allPages.checkoutPage.getOrderSummaryProductQuantity()).toContainText('2');
    await expect(allPages.checkoutPage.getOrderSummaryProductPrice()).toContainText(productPrice);

    const subtotalValue = parseFloat(cleanPrice) * 2;
    const formattedSubtotal = subtotalValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    await expect(await allPages.checkoutPage.getOrderSummarySubtotalValue()).toContain(formattedSubtotal);
    await expect(allPages.checkoutPage.getOrderSummaryShippingValue()).toContainText('Free');
    await allPages.checkoutPage.clickOnPlaceOrder();

    // Order details and return to home
    await allPages.orderDetailsPage.assertOrderDetailsTitle();
    await allPages.orderDetailsPage.assertOrderPlacedName();
    await allPages.orderDetailsPage.assertOrderPlacedMessage();
    await allPages.orderDetailsPage.assertOrderPlacedDate();
    await allPages.orderDetailsPage.assertOrderInformationTitle();
    await allPages.orderDetailsPage.assertOrderConfirmedTitle();
    await allPages.orderDetailsPage.assertOrderConfirmedMessage();
    await allPages.orderDetailsPage.assertShippingDetailsTitle();
    await allPages.orderDetailsPage.assertShippingEmailValue(email);
    await allPages.orderDetailsPage.assertPaymentMethodAmount(formattedSubtotal);
    await allPages.orderDetailsPage.assertDeliveryAddressLabel();
    await allPages.orderDetailsPage.assertDeliveryAddressValue();
    await allPages.orderDetailsPage.assertContinueShoppingButton();

    await allPages.orderDetailsPage.assertOrderSummaryTitle();
    await allPages.orderDetailsPage.assertOrderSummaryProductName(productName);
    await allPages.orderDetailsPage.assertOrderSummaryProductQuantity('2');
    await allPages.orderDetailsPage.assertOrderSummaryProductPrice(productPrice);
    await allPages.orderDetailsPage.assertOrderSummarySubtotalValue(formattedSubtotal);
    await allPages.orderDetailsPage.assertOrderSummaryShippingValue('Free');
    await allPages.orderDetailsPage.assertOrderSummaryTotalValue(formattedSubtotal);
    await allPages.orderDetailsPage.clickBackToHomeButton();
  });
});

test('Verify that user add product to cart before logging in and then complete order after logging in', async ({ allPages }) => {
  await test.step('Navigate and add product to cart before logging in', async () => {
    await allPages.homePage.clickOnShopNowButton();
    await allPages.homePage.clickProductImage();
    await allPages.homePage.clickAddToCartButton();
    await allPages.homePage.validateAddCartNotification();
    await allPages.loginPage.clickOnUserProfileIcon();
  })
  await test.step('Login and complete order', async () => {
    await login(allPages);
    await allPages.cartPage.clickOnCartIcon();
    await allPages.cartPage.clickOnCheckoutButton();
    await allPages.checkoutPage.verifyCheckoutTitle();
    await allPages.checkoutPage.selectCashOnDelivery();
    await allPages.checkoutPage.verifyCashOnDeliverySelected();
    await allPages.checkoutPage.clickOnPlaceOrder();
    await allPages.checkoutPage.verifyOrderPlacedSuccessfully();
})
});

test('Verify that user can filter products by price range', async ({ allPages }) => {
    await login(allPages);
    await allPages.homePage.clickOnShopNowButton();
    await allPages.homePage.clickOnFilterButton();
    await allPages.homePage.adjustPriceRangeSlider('500', '1500');
    await allPages.homePage.clickOnFilterButton();
});

test('Verify if user can add product to wishlist, moves it to card and then checks out', async ({ allPages }) => {
    await login(allPages);
  
    await test.step('Add product to wishlistand then add to cart', async () => {
      await allPages.homePage.clickOnShopNowButton();
      await allPages.inventoryPage.addToWishlist();
      await allPages.inventoryPage.assertWishlistIcon();
      await allPages.inventoryPage.clickOnWishlistIconHeader();
      await allPages.inventoryPage.assertWishlistPage();
      await allPages.inventoryPage.clickOnWishlistAddToCard();
    })
  
    await test.step('Checkout product added to cart', async () => {
      await allPages.cartPage.clickOnCartIcon();
      await allPages.cartPage.clickOnCheckoutButton();
      await allPages.checkoutPage.verifyCheckoutTitle();
      await allPages.checkoutPage.selectCashOnDelivery();
      await allPages.checkoutPage.verifyCashOnDeliverySelected();
      await allPages.checkoutPage.clickOnPlaceOrder();
      await allPages.checkoutPage.verifyOrderPlacedSuccessfully();
    })
  
});

test('Verify new user views and cancels an order in my orders', async ({ allPages }) => {
    const email = `test+${Date.now()}@test.com`;
    const firstName = 'Test';
    const lastName = 'User';

    let productName= `Rode NT1-A Condenser Mic`;

  await test.step('Verify that user can register successfully', async () => {
    await allPages.loginPage.clickOnUserProfileIcon();
    await allPages.loginPage.validateSignInPage();
    await allPages.loginPage.clickOnSignupLink();
    await allPages.signupPage.assertSignupPage();
    await allPages.signupPage.signup(firstName, lastName, email, process.env.PASSWORD);
    await allPages.signupPage.verifySuccessSignUp();
  })

  await test.step('Verify that user can login successfully', async () => {
    await allPages.loginPage.validateSignInPage();
    await allPages.loginPage.login(email, process.env.PASSWORD);
    await allPages.loginPage.verifySuccessSignIn();
    await expect(allPages.homePage.getHomeNav()).toBeVisible({ timeout: 30000 });
  })

  await test.step('Navigate to All Products and add view details of a random product', async () => {
    await allPages.homePage.clickAllProductsNav();
    await allPages.allProductsPage.assertAllProductsTitle();
    productName = await allPages.allProductsPage.getNthProductName(1);
    await allPages.allProductsPage.clickNthProduct(1);
    await allPages.productDetailsPage.clickAddToCartButton();
  })

  await test.step('Add product to cart, add new address and checkout', async () => {
    await allPages.productDetailsPage.clickCartIcon();
    await allPages.cartPage.assertYourCartTitle();
    await expect(allPages.cartPage.getCartItemName()).toContainText(productName, { timeout: 10000 });
    await allPages.cartPage.clickOnCheckoutButton();
    await allPages.checkoutPage.verifyCheckoutTitle();
    await allPages.checkoutPage.fillShippingAddress(
      firstName, email, 'New York', 'New York', '123 Main St', '10001', 'United States'
    );
    await allPages.checkoutPage.clickSaveAddressButton();
    await allPages.checkoutPage.assertAddressAddedToast();
  })

  await test.step('Complete order and verify in my orders', async () => {
    await allPages.checkoutPage.selectCashOnDelivery();
    await allPages.checkoutPage.verifyCheckoutTitle();
    await allPages.checkoutPage.clickOnPlaceOrder();
    await allPages.checkoutPage.verifyOrderPlacedSuccessfully();
    await allPages.inventoryPage.clickOnContinueShopping();

    await allPages.loginPage.clickOnUserProfileIcon();
    await allPages.orderPage.clickOnMyOrdersTab();
    await allPages.orderPage.clickCancelOrderButton();
    await allPages.orderPage.confirmCancellation();
  });
});

test('Verify That a New User Can Successfully Complete the Journey from Registration to a Multiple Order Placement', async ({ allPages }) => {
    const email = `test+${Date.now()}@test.com`;
    const firstName = 'Test';
    const lastName = 'User';

    let productName= `Rode NT1-A Condenser Mic`;

  await test.step('Verify that user can register successfully', async () => {
    // Signup
    await allPages.loginPage.clickOnUserProfileIcon();
    await allPages.loginPage.validateSignInPage();
    await allPages.loginPage.clickOnSignupLink();
    await allPages.signupPage.assertSignupPage();
    await allPages.signupPage.signup(firstName, lastName, email, process.env.PASSWORD);
    await allPages.signupPage.verifySuccessSignUp();
  })

  await test.step('Verify that user can login successfully', async () => {
    // Login as new user
    await allPages.loginPage.validateSignInPage();
    await allPages.loginPage.login(email, process.env.PASSWORD);
    await allPages.loginPage.verifySuccessSignIn();
    await expect(allPages.homePage.getHomeNav()).toBeVisible({ timeout: 30000 });
  })

  await test.step('Navigate to All Products and add view details of a random product', async () => {
    await allPages.homePage.clickOnShopNowButton();
    await allPages.allProductsPage.assertAllProductsTitle();
    await allPages.allProductsPage.clickNthProduct(1);
    await allPages.productDetailsPage.clickOnReviewsTab();
    await allPages.productDetailsPage.assertReviewsTab();
    await allPages.productDetailsPage.clickOnAdditionalInfoTab();
    await allPages.productDetailsPage.assertAdditionalInfoTab();
  })

  await test.step('Add product to cart, change quantity, add new address and checkout', async () => {
    await allPages.productDetailsPage.clickAddToCartButton();
    await allPages.productDetailsPage.clickCartIcon();
    await allPages.cartPage.clickIncreaseQuantityButton();
    await allPages.cartPage.clickOnCheckoutButton();
    await allPages.checkoutPage.verifyCheckoutTitle();
    await allPages.checkoutPage.selectCashOnDelivery();
    await allPages.checkoutPage.verifyCashOnDeliverySelected();
    await allPages.checkoutPage.fillShippingAddress(process.env.SFIRST_NAME, email, process.env.SCITY, process.env.SSTATE, process.env.SSTREET_ADD, process.env.SZIP_CODE, process.env.SCOUNTRY);
    await allPages.checkoutPage.clickSaveAddressButton();
    await allPages.checkoutPage.clickOnPlaceOrder();
    await allPages.checkoutPage.verifyOrderPlacedSuccessfully();
    await allPages.checkoutPage.verifyOrderConfirmedTitle();
    await allPages.checkoutPage.clickOnContinueShoppingButton();
  })

  await test.step('Add another product to cart, select existing address and checkout', async () => {
    await allPages.homePage.clickOnShopNowButton();
    await allPages.allProductsPage.assertAllProductsTitle();
    await allPages.allProductsPage.clickNthProduct(1);
    await allPages.productDetailsPage.clickAddToCartButton();
    await allPages.productDetailsPage.clickCartIcon();
    await allPages.cartPage.clickOnCheckoutButton();
    await allPages.checkoutPage.verifyCheckoutTitle();
    await allPages.checkoutPage.selectCashOnDelivery();
    await allPages.checkoutPage.verifyCashOnDeliverySelected();
    await allPages.checkoutPage.clickOnPlaceOrder();
    await allPages.checkoutPage.verifyOrderPlacedSuccessfully();
  })
});

test('Verify that the new user is able to Sign Up, Log In, and Navigate to the Home Page Successfully', async ({ allPages }) => {
    const email = `test+${Date.now()}@test.com`;
    const firstName = 'Test';
    const lastName = 'User';

  await test.step('Verify that user can register successfully', async () => {
    await allPages.loginPage.clickOnUserProfileIcon();
    await allPages.loginPage.validateSignInPage();
    await allPages.loginPage.clickOnSignupLink();
    await allPages.signupPage.assertSignupPage();
    await allPages.signupPage.signup(firstName, lastName, email, process.env.PASSWORD);
    await allPages.signupPage.verifySuccessSignUp();
  })

  await test.step('Verify that user can login successfully', async () => {
    await allPages.loginPage.validateSignInPage();
    await allPages.loginPage.login(email, process.env.PASSWORD);
    await allPages.loginPage.verifySuccessSignIn();
    await expect(allPages.homePage.getHomeNav()).toBeVisible({ timeout: 30000 });
  })
})

test('Verify that user is able to fill Contact Us page successfully', async ({ allPages }) => {
    await login(allPages);
    await allPages.homePage.clickOnContactUsLink();
    await allPages.contactUsPage.assertContactUsTitle();
    await allPages.contactUsPage.fillContactUsForm();
    await allPages.contactUsPage.verifySuccessContactUsFormSubmission();

    // ⚠️ INTENTIONAL FAILURE (2 of 2) — deliberately wrong assertion kept here to
    // demonstrate how failures surface in the report. Delete this line to make the
    // test pass.
    expect('form-submitted').toBe('submission-blocked');
});

test('Verify that user is able to submit a product review ', async ({ allPages }) => {
  await test.step('Login as existing user and navigate to a product', async () => {
    await login(allPages);
  })

  await test.step('Navigate to all product section and select a product', async () => {
    await allPages.homePage.clickOnShopNowButton();
    await allPages.allProductsPage.assertAllProductsTitle();
    await allPages.allProductsPage.clickNthProduct(1);
  })

  await test.step('Submit a product review and verify submission', async () => {
    await allPages.productDetailsPage.clickOnReviewsTab();
    await allPages.productDetailsPage.assertReviewsTab();
    
    await allPages.productDetailsPage.clickOnWriteAReviewBtn();
    await allPages.productDetailsPage.fillReviewForm();
    await allPages.productDetailsPage.assertSubmittedReview({
        name: 'John Doe',
        title: 'Great Product',
        opinion: 'This product exceeded my expectations. Highly recommend!'
    });
  })
});

test('Verify that user can edit and delete a product review', async ({ allPages }) => {
  await test.step('Login as existing user and navigate to a product', async () => {
    await login(allPages);
  })

  await test.step('Navigate to all product section and select a product', async () => {
    await allPages.homePage.clickOnShopNowButton();
    await allPages.allProductsPage.assertAllProductsTitle();
    await allPages.allProductsPage.clickNthProduct(1);
  })

  await test.step('Submit a product review and verify submission', async () => {
    await allPages.productDetailsPage.clickOnReviewsTab();
    await allPages.productDetailsPage.assertReviewsTab();
    
    await allPages.productDetailsPage.clickOnWriteAReviewBtn();
    await allPages.productDetailsPage.fillReviewForm();
    await allPages.productDetailsPage.assertSubmittedReview({
        name: 'John Doe',
        title: 'Great Product',
        opinion: 'This product exceeded my expectations. Highly recommend!'
    }); 
  })

  await test.step('Edit the submitted review and verify changes', async () => {
    await allPages.productDetailsPage.clickOnEditReviewBtn();
    await allPages.productDetailsPage.updateReviewForm();
    await allPages.productDetailsPage.assertUpdatedReview({
        title: 'Updated Review Title',
        opinion: 'This is an updated review opinion.'
    })
    });

  await test.step('Delete the submitted review and verify deletion', async () => {
    await allPages.productDetailsPage.clickOnDeleteReviewBtn();
  })
});

test('Verify that user can purchase multiple quantities in a single order', async ({ allPages }) => {
    const productName = 'GoPro HERO10 Black';
    await login(allPages);
    await allPages.inventoryPage.clickOnShopNowButton();
    await allPages.inventoryPage.clickOnAllProductsLink();
    await allPages.inventoryPage.searchProduct(productName);
    await allPages.inventoryPage.verifyProductTitleVisible(productName);
    await allPages.inventoryPage.clickOnAddToCartIcon();

    await allPages.cartPage.clickOnCartIcon();
    await allPages.cartPage.verifyCartItemVisible(productName);
    await allPages.cartPage.clickIncreaseQuantityButton();
    await allPages.cartPage.verifyIncreasedQuantity('2');
    await allPages.cartPage.clickOnCheckoutButton();
    await allPages.checkoutPage.verifyCheckoutTitle();
    await allPages.checkoutPage.verifyProductInCheckout(productName);
    await allPages.checkoutPage.selectCashOnDelivery();
    await allPages.checkoutPage.verifyCashOnDeliverySelected();
    await allPages.checkoutPage.clickOnPlaceOrder();
    await allPages.checkoutPage.verifyOrderPlacedSuccessfully();
});

test('Verify that all the navbar are working properly', async ({ allPages }) => {
    await login(allPages);
    await allPages.homePage.clickBackToHomeButton();
    // await allPages.homePage.assertHomePage();
    await allPages.homePage.clickAllProductsNav();
    await allPages.allProductsPage.assertAllProductsTitle();
    await allPages.homePage.clickOnContactUsLink();
    await allPages.contactUsPage.assertContactUsTitle();
    await allPages.homePage.clickAboutUsNav();
    await allPages.homePage.assertAboutUsTitle();
});

test('Verify that user is able to delete selected product from cart', async ({ allPages }) => {
    const productName = 'GoPro HERO10 Black';
    await login(allPages);
    await allPages.inventoryPage.clickOnShopNowButton();
    await allPages.inventoryPage.clickOnAllProductsLink();
    await allPages.inventoryPage.searchProduct(productName);
    await allPages.inventoryPage.verifyProductTitleVisible(productName);
    await allPages.inventoryPage.clickOnAddToCartIcon();

    await allPages.cartPage.clickOnCartIcon();
    await allPages.cartPage.verifyCartItemVisible(productName);
    await allPages.cartPage.clickOnDeleteProductIcon();
    await allPages.cartPage.verifyCartItemDeleted(productName);
    await allPages.cartPage.verifyEmptyCartMessage();
    await allPages.cartPage.clickOnStartShoppingButton();
    await allPages.allProductsPage.assertAllProductsTitle();
});