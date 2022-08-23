var express = require('express');
const productHelpers = require('../helpers/product-helpers');
const adminHelper = require('../helpers/admin-helper');
const multer=require('multer');
const router = express.Router();

const verifyAdminLogin=(req,res,next)=>{
  if(req.session.adminloggedIn){
     next()
   }else{
     res.redirect('/admin')
 }
  }
 

const fileStorageEngine= multer.diskStorage({
  destination:(req,file,cb)=>{
    cb(null,'./public/product-images')
  },
  filename:(req,file,cb)=>{
    cb(null,Date.now()+"--" + file.originalname);

  }
});

const upload=multer({storage:fileStorageEngine})

const adminLogin = (req, res, next) => {
  if (req.session.adminLog) {
    next()
  }
  else {
    res.redirect('/admin')
  }
}



/* GET users listing. */
router.get('/', function(req, res, next) {
  if(req.session.adminloggedIn){
   
     res.render('/admin/home',{admin:true})
   }else{
    res.render('admin/admin-login')
 }

 
});
router.get('/home',async(req,res)=>{
  if(req.session.adminloggedIn){
    let totalsale = await productHelpers.getTotalSale()
    let cod= await productHelpers.getCod()
    let razorpay = await productHelpers.getRazorpay()
    let paypal = await productHelpers.getPaypal()
    res.render('admin/home',{admin:true,totalsale,cod,razorpay,paypal})
  }else{
    res.render('admin/admin-login')
  }
})


router.post('/admin-login',(req,res,next)=>{
  console.log(req.body);

 let admin= adminHelper.doLogin(req.body).then((response)=>{
    if(response.status)
    {
       req.session.adminloggedIn = true
      req.session.admin=response.admin
      req.session.adminLog={
        admin
      }
      res.redirect('/admin/home')
    }
    else{
      res.redirect('/admin')
    }
  })
})


//  router.get('/view-products',function(req,res){
//    res.render('admin/view-products',{admin:true})
//  })
router.get('/add-product',async function(req,res){
  if(req.session.adminloggedIn){
  let category=await productHelpers.getCategory()
  res.render('admin/add-product',{admin:true,category})
  }
  else{
    res.redirect('/admin')
  }
})

router.post('/add-product',upload.array('Image',4),(req,res)=>{
  var filenames = req.files.map(function(file){
    return file.filename;
  })
  req.body.Image = filenames;
   console.log(req.body)
  console.log("multer vanu");
    // console.log(req.files.Image)
  productHelpers.addProduct(req.body).then(()=>{
    res.redirect('/admin/view-products')
  })
   
})



router.get('/view-products',async(req,res)=>{
  if(req.session.adminloggedIn){
    let category=await productHelpers.getCategory()
    productHelpers.getAllProducts().then((products)=>{
      console.log(products)
      
      console.log(category)
     
     res.render('admin/view-products',{admin:true,products,category});
   })
  }else {
    res.redirect('/admin')
  }
 
})

router.get('/delete-product/:id',(req,res)=>{
  let proId=req.params.id
  console.log(proId);
  productHelpers.deleteProduct(proId).then((response)=>{
    res.redirect('/admin/view-products')
  })
})

router.get('/edit-product/:id',async(req,res)=>{

  let product=await productHelpers.getProductDetails(req.params.id)
  console.log(product)
  res.render('admin/edit-product',{admin:true,product})
})


router.post('/edit-product/:id',upload.array('Image',4),(req,res)=>{
  
  var filenames = req.files.map(function(file){
    return file.filename;
  })
  req.body.Image = filenames;
  console.log(req.body)
  console.log("multer vanu");
  // console.log(req.files.Image)
  console.log("pppppppppppppppp");
  productHelpers.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin/view-products')
   
    
  })
})

router.get('/all-users',function (req,res,next){
 if(req.session.adminloggedIn){
  productHelpers.getAllUsers().then((users)=>{
    res.render('admin/all-users',{admin:true,users})
  })
  }
  else{
    res.redirect('/admin')
  }


})

router.get('/logout',(req,res)=>{
 console.log('hhhhh');
 req.session.adminloggedIn = null;
 req.session.admin = null;
 req.session.adminLog = null;
    // req.session.destroy()
  res.redirect('/admin')
})

router.get('/block-user/:id',(req,res)=>{
  let userId=req.params.id
  productHelpers.blockUser(userId).then((response)=>{
    
    res.redirect('/admin/all-users')
  })
})
router.get('/unblock-user/:id',(req,res)=>{
  let userId=req.params.id
  productHelpers.unblockUser(userId).then((response)=>{
    
    res.redirect('/admin/all-users')
  })
})

router.get('/add-category',(req,res)=>{
  if(req.session.adminloggedIn){
  res.render('admin/add-category',{admin:true})
  }
  else{
    res.redirect('/admin')
  }
})



router.post('/add-category',upload.array('Image',4),(req,res)=>{
  var filenames = req.files.map(function(file){
    return file.filename;
  })
  req.body.Image = filenames;
   console.log(req.body)
  productHelpers.addCategory(req.body).then(()=>{
   
    res.redirect('/admin/view-category')
   
  })
})

router.get('/view-category',(req,res)=>{
  if(req.session.adminloggedIn){
  productHelpers.getCategory().then((category)=>{
    console.log("hhhhhhhhhhhhhhhhhhhhhhhh")
    console.log(category);
    res.render('admin/view-category',{admin:true,category})
  })
}
else{
  res.redirect('/admin')
}
 
})

router.get('/edit-category/:id',async(req,res)=>{
  let product=await productHelpers.getCategoryDetails(req.params.id)
  console.log(product);
  res.render('admin/edit-category',{admin:true,product})

})

router.post('/edit-category/:id',upload.array('Image',1),(req,res)=>{
  var filenames = req.files.map(function(file){
    return file.filename;
  })
  req.body.Image = filenames;
  productHelpers.updateCategory(req.params.id,req.body).then(()=>{
    res.redirect('/admin/view-category')
  })
})

router.get('/delete-category/:id',(req,res)=>{
  let proId=req.params.id
  console.log(proId);
  productHelpers.deleteCategory(proId).then((response)=>{
    res.redirect('/admin/view-category')
  })
})

router.get('/order-list',verifyAdminLogin,(req,res)=>{
  productHelpers.getAllOrders().then((orderList)=>{
    res.render('admin/order-list',{admin:true,orderList})
  })
  
})


router.get('/cancel-order/:id', (req, res) => {
  id = req.params.id;
  console.log(id);
  productHelpers.cancelOrder(id).then(() => {
    res.redirect('/admin/order-list')
  })


})

router.get('/ship-order/:id', (req, res) => {
  id = req.params.id;
  console.log(id);
  productHelpers.shipOrder(id).then(() => {
    res.redirect('/admin/order-list')
  })


})

router.get('/deleiver-order/:id', (req, res) => {
  id = req.params.id;
  console.log(id);
  productHelpers.deleiverOrder(id).then(() => {
    res.redirect('/admin/order-list')
  })


})

router.get('/return-order/:id',(req,res)=>{
  id=req.params.id;
  productHelpers.returnOrder(id).then(()=>{
    res.redirect('/admin/order-list')
  })
})

router.get('/chart',async(req,res)=>{
  let totalsale = await productHelpers.getTotalSale()
  let cod= await productHelpers.getCod()
  let razorpay = await productHelpers.getRazorpay()
  let paypal = await productHelpers.getPaypal()
  console.log(cod);
  console.log(totalsale);
  console.log("cccccccccccccccccccccc");
  res.render('admin/chart',{admin:true,totalsale,cod,razorpay,paypal})
})


router.get('/add-offer',(req,res)=>{
  res.render('admin/add-offer',{admin:true})
})

router.post('/add-offer',(req,res)=>{
  console.log("3239");
 productHelpers.addOffer(req.body)
  console.log(req.body);
  console.log("186");
  res.redirect('/admin/add-offer')
 
  
 })
 
router.get('/view-offer',(req,res)=>{
  productHelpers.getOffer().then((offer)=>{
    console.log(offer);
    res.render('admin/view-offer',{admin:true,offer})
  })
})

router.get('/edit-offer/:id',async(req,res)=>{
  let offer=await productHelpers.getAllOffer(req.params.id)
 
  res.render('admin/edit-offer',{admin:true,offer})
})

router.post('/edit-offer/:id',(req,res)=>{

  console.log("11111111000000000011111111111");
  productHelpers.updateOffer(req.params.id,req.body).then(()=>{
    res.redirect('/admin/view-offer')
  })
})
router.get('/apply-offer/:id',async(req,res)=>{
 
  let product=await productHelpers.getProductDetails(req.params.id) 
  let offer=await productHelpers.getOffer()
  console.log(offer);
  console.log("9999999999999999999");
  res.render('admin/apply-offer',{admin:true,product,offer})
})

router.post('/apply-offer',(req,res)=>{
 
  console.log("ooooooooooooooooooo");
  console.log(req.body);
  productHelpers.applyOffer(req.body).then((result)=>{
    res.redirect('/admin/view-products')
  })


})

router.get('/remove-offer/:id',(req,res)=>{
  console.log(req.params.id);
  productHelpers.removeOffer(req.params.id).then((response)=>{
    console.log(response);
    console.log("pppppppppppppp");
    res.redirect('/admin/view-products')
  })
})
// ----COUPON------//
router.get('/add-coupon',(req,res)=>{
  res.render('admin/add-coupon',{admin:true})
})

router.post('/add-coupon',(req,res)=>{
  productHelpers.addCoupon(req.body)
  res.redirect('/admin/add-coupon')
})

router.get('/view-coupon',(req,res)=>{
  productHelpers.getCoupon().then((coupon)=>{
    console.log(coupon);
    res.render('admin/view-coupon',{admin:true,coupon})
  })
  
})

router.get('/edit-coupon/:id',async(req,res)=>{
  let coupon = await productHelpers.getAllCoupon(req.params.id)
  res.render('admin/edit-coupon',{admin:true,coupon})
})

router.post('/edit-coupon/:id',(req,res)=>{
  productHelpers.updateCoupon(req.params.id,req.body).then(()=>{
    console.log("bbbbbbbbbbbbbbbbbbbbbbb");
    res.redirect('/admin/view-coupon')
  })
})

router.get('/sales-report',(req,res)=>{
  if(req.session.adminLog){
  let report = req.session.report
  res.render('admin/sales-report',{admin:true,report})
  }else{
    res.redirect('/admin')
  }
})

router.post('/sales-report',(req,res)=>{
  let fromdate = new Date(req.body.from)
  let todate = new Date(req.body.to) 
 productHelpers.salesReport(fromdate,todate).then((sales)=>{
  console.log(sales);
  req.session.report=sales;
  console.log("nokanda njan vanu");
  res.redirect('/admin/sales-report',)
 })
})

router.get('/disable-coupon/:id',(req,res)=>{
  let coupId=req.params.id
  productHelpers.disableCoupon(coupId).then((response)=>{
    
    res.redirect('/admin/view-coupon')
  })
})

router.get('/activate-coupon/:id',(req,res)=>{
  let coupId=req.params.id
  console.log(coupId);
  productHelpers.activateCoupon(coupId).then((response)=>{
    
    res.redirect('/admin/view-coupon')
  })
})

router.get('/coupon-history/:id',async(req,res)=>{
  let coupId=req.params.id
let History =  await productHelpers.coupHistory(coupId)
console.log(History);
console.log("ooooooooooooooooooooooooooooooooooooooooooooooooooooo");
    res.render('admin/history',{admin:true,History})

 
})


//////////////////// BANNER MANAGEMENT //////////////////////////////////

router.get('/banner', (req, res) => {
  // productHelpers.getBanner().then((banner) => {

  //   let imgErr=req.session.imgErr
    res.render('admin/banner', { admin:true })
    // req.session.imgErr=false
  })

// })
router.post('/banner',  (req, res) => {
  console.log(req.file);
  if(req.file==null){
    req.session.imgErr="No image is found"
    res.redirect('/admin/banner')
  }else{

    productHelpers.addBanner(req.file).then(() => {
      console.log('complete');
      res.redirect('/admin/banner')
    })
  }


})


module.exports = router;
 