var express = require('express');
var router = express.Router();
const userHelpers = require('../helpers/user-helpers')
const productHelpers = require('../helpers/product-helpers');
var userDetails;

require('dotenv').config()
const SSID =process.env.serviceID
const ASID =process.env.accountSID
const AUID =process.env.authToken


var otp = require('../config/otp')
const client = require('twilio')(ASID,AUID)
const paypal = require('paypal-rest-sdk');
var userDetails;

const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  }
  else {
    res.redirect('/login')
  }
}
/* GET home page. */
router.get('/', async function (req, res, next) {
  
  let User = req.session.User
  console.log(User)
  console.log("kitttttiiiii")
  let cartCount = null;
  if (req.session.User) {
    cartCount = await userHelpers.getCartCount(req.session.User._id)
  }
  productHelpers.getCategory().then((category) => {

    productHelpers.getAllProducts().then((products) => {
      console.log(products)

      res.render('user/index', { user: true, products, User, cartCount, category });
   
    })
  })
});
router.get('/login', function (req, res) {
  // let user=req.session.user
  // console.log(user)

  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    console.log(req.session.loginErr);
    res.render('user/login', { loginErr: req.session.loginErr })
    req.session.loginErr = false
  }
  // res.render('user/login')
})

router.get('/signup', function (req, res) {
  if (req.session.loggedIn) {
    res.render('/')
  } else {
    res.render('user/signup', { signupErr: req.session.signupErr })

  }
  // res.render('user/signup')
})
router.post('/signup', (req, res) => {
  // if(req.session.loggedIn){
  //   res.redirect('/otp')
  // }
  // userHelpers.signUpCheck(req.body).then((response)=>{
  //   if(response.status){
  //     req.session.signupErr="Email address already exist!!"
  //     console.log('sign up error');
  //     res.redirect('/signup')
  //   }else{
  // userHelpers.doSignup(req.body).then((response)=>{
  //    console.log(response);

  //   req.session.loggedIn=true
  //   req.session.user=req.body
  //   res.redirect('/otp')
  // })
  // userHelpers.doSignup(req.body).then((response)=>{

  //   console.log(response)
  //   res.redirect('/otp')
  // }) 

  userHelpers.doSignup(req.body).then((response) => {
    if (response.err) {
      req.session.signupErr = response.err
      res.redirect('/signup')
    } else {

      userDetails = response;
      // console.log("Vanu")
      console.log(userDetails);
      res.redirect('/otp')
    }

  })

})

router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.err) {
      req.session.loginErr = response.err
      res.redirect('/login')
    } else {
      if (response.status) {
        req.session.loggedIn = true
        req.session.User = response.user
        console.log(response.status)

        // console.log("name vanu")
        res.redirect('/')
      }
      else {
        console.log(response.status)
        req.session.loginErr = "Invalid username or Password"
        res.redirect('/login')
      }
    }

  })
})

router.get('/otp', (req, res) => {
  // if(req.session.loggedIn){
  //   res.redirect('/');
  // } else {
  // res.render('user/otp')
  // } 
  res.render('user/otp')
})

router.post('/otp', (req, res) => {
  userHelpers.signupOtp(req.body, userDetails).then((response) => {
    if (response.err) {
      req.session.otperr = response.err
      // console.log(err)
      console.log("Invalid Otp")
      res.redirect('/otp')
    } else {
      console.log(response.Email);
      req.session.User = response.Name
      req.session.loggedIn = true
      // console.log("Vanu")
      res.redirect('/')
    }
  })

})
router.get('/logout', (req, res) => {
  // req.session.destroy()
  // res.redirect('/login')
  req.session.User = null
  req.session.loggedIn = false
  res.redirect('/login')
})

router.get('/cart', verifyLogin, async (req, res) => {
  try{
  let allTotal = 0
  let products = await userHelpers.getCartProducts(req.session.User._id)
  //  let productprice= await userHelpers.getSinglePrice(req.session.User._id)
  let totalValue = await userHelpers.getTotalValue(req.session.User._id)

  console.log(totalValue);
  allTotal = totalValue

  subtotal = totalValue;
  console.log("...........................");
  // let findcoupon = await userHelpers.findCoupon(req.session.User._id)
  // if(findcoupon.coupon){
  //   discount = parseInt(findcoupon.coupondis);
  //   let ofrcoup =parseInt(totalValue*(discount/100))
  //   totalValue = parseInt(totalValue - ofrcoup);
  //   console.log(totalValue);

  //   console.log("nee varundo???");
  // }

  offertotal = await userHelpers.getOfferValue(req.session.User._id)
  console.log(offertotal);
  console.log("offertotal");
  offer = subtotal - offertotal
  console.log(offer);
  console.log("offer");
  allTotal = offer
  let findcoupon = await userHelpers.findCoupon(req.session.User._id)
  if (findcoupon.coupon) {
    if (offertotal) {
      console.log(offertotal);
      console.log("engot vanit indo");
      let discountcoup = Math.round(offer * (findcoupon.coupondis / 100));
      console.log(discountcoup);
      req.session.amount=discountcoup;
      console.log("eyy vanile");

      coupondis = offer - discountcoup;
      console.log(coupondis);
      console.log("epo nokiyeee");
      allTotal = coupondis
    }
    else {
      let discountcoup = Math.round(totalValue * (findcoupon.coupondis / 100));
      console.log(discountcoup);
      req.session.coupoff = findcoupon.coupondis
      req.session.amount=discountcoup;
      console.log("correct value");
      coupondis = subtotal - discountcoup;
      console.log(coupondis);
      console.log("totalvalue");
      allTotal = coupondis
    }
  }
  else {
    discountcoup = 0;
    coupondis = 0;
  }
  console.log(products);
  console.log("ddddddddddddddd");
  console.log(totalValue);
 

 console.log("mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm");
  req.session.grandTottal = allTotal 
  res.render('user/cart', { products, allTotal, User: req.session.User, totalValue, offer, offertotal, coupondis,amount:req.session.amount,coupoff:req.session.coupoff })
} catch(error){
  console.log(error)
    res.status(400)
}

})

router.get('/add-to-cart/:id', (req, res) => {
  console.log("api vanu");
  console.log(req.params.id)
  userHelpers.addToCart(req.params.id, req.session.User._id).then(() => {
    res.json({ status: true })
  })
})

router.post('/change-product-quantity', (req, res, next) => {

  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalValue(req.session.User._id)

    offertotal = await userHelpers.getOfferValue(req.session.User._id)
    response.offertotal = response.total - offertotal;
    res.json(response)

  })
})

router.post('/remove-product', (req, res) => {
  userHelpers.removeItem(req.body).then((response) => {
    res.json(response)
  })
})

router.get('/view-details/:id', async (req, res) => {
  try{
  let id = req.params;
  console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  console.log(id);
  let product = await productHelpers.getProductDetails(id)
  userHelpers.addToCart(req.params.id)
  console.log(product);
  res.render('user/one-product', { product, User: req.session.User })
  }catch(error){
    res.redirect('/error')
  }
})

// router.get('/one-product/:id',async(req,res)=>{
//   let id=req.params
//   let product=await productHelpers.getProductDetails(id)
//   console.log(product)
//   res.render('user/one-product',{product});
// })

router.get('/show-category/:id', (req, res) => {
  console.log(req.params.id);
  categ = req.params.id;
  console.log("gggggggggggggggg");
  console.log(categ);

  userHelpers.getCategoryName(categ).then((product) => {
    productHelpers.getCategory().then((category) => {


      console.log(product);
      console.log('sdfghjk');
      res.render('user/view-category', { user: true, product, category })
    })
  })

})
router.get('/checkout', verifyLogin, async (req, res) => {
  let wallet = await userHelpers.getWallet(req.session.User._id)
  console.log(wallet);

  let address = await userHelpers.getAddress(req.session.User._id)
  let total = await userHelpers.getTotalValue(req.session.User._id)
  let totalPrice = total;
  req.session.total = total
  let totals=totalPrice
  req.session.discount = total
  console.log(totalPrice);
  console.log("77777777777777777777777777777777777777777777777777");
  offertotal = await userHelpers.getOfferValue(req.session.User._id)
  req.session.offertotal = offertotal
  offer = totals - offertotal
  req.session.discount = offer;
  total = req.session.grandTottal
 console.log(total);
 console.log("||||||||||||||||||||||||||||||||||||||||||||||||||||||");
 
  console.log("njan aan grandtotal");
  let findcoupon = await userHelpers.findCoupon(req.session.User._id)
  if (findcoupon.coupon) {
    if (offertotal) { 
      discountcoup = Math.round(offer * (findcoupon.coupondis / 100));
      console.log(discountcoup);
      console.log("/////////////////////////////////////////////////////////////////////");
      req.session.offer = discountcoup
      totalPrice = totals - discountcoup;
      req.session.discount = totalPrice
    }
    else {
      discountcoup = Math.round(totals * (findcoupon.coupondis / 100));
      console.log(discountcoup);
      console.log("''''''''''''''''''''''''''''''''''''''''''");
      req.session.coupon = discountcoup
      totalPrice = totals - discountcoup;
      req.session.discount = totalPrice     
    }
  }
  res.render('user/checkout', { total, User: req.session.User, address, wallet, offertotal, offer, totals: req.session.discount, discountcoup,coupon:req.session.coupon })
})

router.post('/checkout', async (req, res) => {
  
  totalPrice = 0;
  let product = await userHelpers.getCartProductList(req.session.User._id)
  let totalCost = await userHelpers.getTotalValue(req.session.User._id)
  subtotals= totalCost
  totalPrice = totalCost;
  offertotal = await userHelpers.getOfferValue(req.session.User._id)

  console.log("eddddddddddddooooooooooooooo");

  if (offertotal) {
    totalPrice = totalCost - offertotal
  }
  let findcoupon = await userHelpers.findCoupon(req.session.User._id)
  console.log(findcoupon);
  if (findcoupon.coupon) {
    if (offertotal) {
      console.log(offertotal);
      console.log("engot vanit indo");
      let discountcoup = Math.round(offer * (findcoupon.coupondis / 100));
      console.log(discountcoup);
      console.log("eyy vanile");

      coupondis = offer - discountcoup;
      console.log(coupondis);
      
      console.log("epo nokiyeee");
      totalPrice = coupondis

    }

    else {
      let discountcoup = Math.round(totalCost*(findcoupon.coupondis / 100));
      coupondis = subtotal - discountcoup;
      console.log(coupondis);
      console.log("totalvalue");
      totalPrice = coupondis
    }
  }


  userHelpers.placeOrder(req.body, product, totalPrice, req.session.User._id, req.session.offertotal, req.session.offer, req.session.coupon, req.session.discount).then(async (orderId) => {
    console.log(req.body);
    console.log("yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy");
    console.log(totalPrice);
    console.log("66666666666666666666666666666666666666666");
    let wallet = await userHelpers.getWallet(req.session.User._id)
    var grater = false;
    if (req.body.wallet == 'true') {
      req.session.walletStatus = true
      req.session.walletAmount = wallet.total
      console.log(wallet.total);
      console.log("fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
      if (wallet.total > totalPrice) {
        grater = true;
      } else {
        totalPrice = totalPrice - wallet.total
      }
    }

    if (grater) {
      userHelpers.reduceTotalWallet(req.session.User._id, totalPrice, orderId).then((response) => {
        console.log(totalPrice);
        console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT");
        userHelpers.updateStatus(orderId).then((response) => {
          res.json({ wallet: true })
        })
      })
    } else {
      // userHelpers.reduceWallet(req.session.User._id).then(() => {
      if (req.body.paymentMethod === 'COD') {
        res.json({ codSuccess: true })
      }
      else if (req.body.paymentMethod === 'paypal') {

        userHelpers.generatePaypal(orderId, totalPrice).then((response) => {
          req.session.orderIDD = orderId
          response.status = 'paypal'
          res.json(response)
        })
      }
      // else if (req.body.paymentMethod === 'wallet'){
      //   userHelpers.getTotalWallet(req.session.User._id,totalPrice).then((response)=>{



      //       console.log("5555555555555")

      //       res.json({codSuccess:true}) 


      //   })    
      // }
      else {
        userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
          console.log("eeeeeeeeeeeeeeeeeeeeee");
          

          res.json(response);
        })
      }
      // })
    }


  })
  console.log(req.body)

})

router.get('/order-success', (req, res) => {
  userHelpers.removeCart(req.session.User._id)
  res.render('user/order-success', { User: req.session.User })
})

router.get('/orders', verifyLogin, async (req, res) => {
  try{
  let orders = await userHelpers.getUserOrders(req.session.User._id)
 
  console.log("evide poyi");

  res.render('user/orders', { User: req.session.User, orders })
  } catch(e){
    res.redirect('/error')
  }
})

// router.get('/view-order-products/:id',async(req,res)=>{
//   let id=req.params;
//   let product= await userHelpers.getOrderProducts(id)
//   console.log("order vanu");
//   res.render('user/view-order-products',{product,User:req.session.User})
// })

router.get('/cancel-order/:id', (req, res) => {
  id = req.params.id;
  console.log(id);
 
  userHelpers.cancelOrder(id, req.session.User._id).then(() => {
    
    res.redirect('/orders')
  })


})

router.get('/return-order/:id', (req, res) => {
  id = req.params.id;
  console.log(id);
  userHelpers.returnOrder(id).then(() => {
    res.redirect('/orders')
  })


})


router.post('/verify-payment', (req, res) => {
  console.log("payment vanuuuuuu");
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(() => {
    if (req.session.walletStatus) {
      userHelpers.reduceWallet(req.session.User._id).then(() => {
        console.log('reducedddd');
      })
    }

    userHelpers.changePaymentStatus(req.body['order[receipt]'], req.session.walletStatus, req.session.walletAmount).then(() => {
      res.json({ status: true })
    })
  }).catch((err) => {
    console.log(err);
    res.json({ status: false, errMsg: 'failed' })
  })
})

router.get('/user-profile', verifyLogin, async (req, res) => {
  try{
  let address = await userHelpers.getAddress(req.session.User._id)
  console.log('kubdlksnvkjdfa');
  console.log(address);
  let total = await userHelpers.getWallet(req.session.User._id)
  res.render('user/user-profile', { User: req.session.User, address, total })
  }catch(e){
    res.redirect('/error')
  }
})

router.get('/edit-user-address/:id', async (req, res) => {
  try{
  // id=req.params.id;
  // console.log(id);
  let address = await userHelpers.getAddressDetails(req.params)
  console.log(address);
  res.render('user/edit-address', { address })
  } catch(e){
    res.redirect('/error')
  }
})

router.post('/edit-user-address/:id', (req, res) => {
  userHelpers.updateAddress(req.params, req.body).then(() => {
    res.redirect('/user-profile')
  })
})

router.get('/change-password', verifyLogin, (req, res) => {

  res.render('user/change-password', { User: req.session.User, status: req.session.pwd })

  req.session.pwd = " "
})

router.post('/change-password', async (req, res) => {
  console.log("kerrrriiiiii");
  console.log(req.body);
  if (req.session.User.Email == req.body.Email) {
    await userHelpers.changePassword(req.body).then((response) => {
      console.log("kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
      if (response.status) {
        req.session.pwd = "Password changed"
        res.redirect('/change-password')
      } else {
        req.session.pwd = "Invalid password or Email"
        res.redirect('/change-password')
      }
    })
  } else {
    req.session.pwd = "Enter the data properly"
    res.redirect('/change-password')
  }
})

router.get('/add-address', (req, res) => {
  res.render('user/add-address', { User: req.session.User })
})

router.post('/add-address', async (req, res) => {
  
  console.log(req.body);
  await userHelpers.addAddress(req.body).then(() => {
    res.redirect('/checkout')
 

  })

})

router.get('/success', async (req, res) => {

  console.log("hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh");
  // let total = await userHelpers.getTotalValue(req.session.User._id)
  total = req.session.grandTottal
  console.log(total);
  console.log("entha prashnam??");
  let a = userHelpers.changeStatus(req.session.User._id, req.session.orderIDD)
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  const execute_payment_json = {
    "payer_id": payerId,
    "transactions": [{
      "amount": {
        "currency": "USD",
        "total": total
      }
    }]
  };

  paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    if (error) {
      console.log(error.response);
      throw error;
    } else {
      console.log("uuuuuuuu");

      console.log(JSON.stringify(payment));
      // res.send('Success');
      res.redirect('/order-success')
    }
  });
});

router.get('/view-order-products/:id', async (req, res) => {
  try{
  console.log("ggggaaaaaannnnaaaaaa");

  let products = await userHelpers.getOrderProducts(req.params.id)
  console.log(products);
  console.log(req.params.id);
  res.render('user/view-order-products', { User: req.session.User._id, products })
  } catch(error){
    res.redirect('/error')
  }
})


router.post('/check-coupon', (req, res) => {
  userHelpers.checkCoupon(req.body.couponname, req.session.User._id).then((status) => {
    res.json(status)

  })
})


router.get('/order-details/:id',verifyLogin, async(req,res)=>{
  // let products = await userHelpers.getOrderProducts(req.params.id,req.session.User._id)
  // console.log(products);
  // let User=req.session.User._id
  let order = await userHelpers.getInvoice(req.params.id,req.session.User._id)
  let products = await userHelpers.getOrderProducts(req.params.id)
  // console.log("\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\");
  // console.log(products);
 
  
  console.log("uuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu");
console.log(order);
console.log(order[0].totalAmount);

  totals = order[0].totalAmount;


  res.render('user/order-details',{ order,products,totals })
})   

router.get('/transaction-history',(req,res)=>{
 
  userHelpers.transHistory(req.session.User._id).then((order)=>{
  console.log(order);
  console.log("*********************************");
 res.render('user/transaction',{order})
 
  })
})


module.exports = router;
