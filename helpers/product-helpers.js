var db = require('../config/connection')
var collection = require('../config/collections');
const { response } = require('../app');
var objectId = require('mongodb').ObjectId
module.exports = {

    addProduct: (product) => {
        console.log(product);
        product.Price = parseInt(product.Price);
        product.discountprice = parseInt(product.discountprice)
        return new Promise((resolve, reject) => {
            db.get().collection('product').insertOne(product).then((data) => {
                // console.log(data);
                resolve(data.insertedId)
            })
        })

    },
    getAllProducts: () => {
        console.log("body vannuu")

        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            console.log(products);
            resolve(products)
        })
    },
    deleteProduct: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: objectId(prodId) }).then((response) => {
                console.log(response)
                resolve(response)
            })
        })
    },
    getProductDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) }).then((product) => {
                resolve(product)
            })
        })
    },
    updateProduct: (proId, proDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION)
                .updateOne({ _id: objectId(proId) }, {
                    $set: {
                        Name: proDetails.Name,
                        Category: proDetails.Category,
                        Description: proDetails.Description,
                        Price: proDetails.Price,
                        discountprice: proDetails.discountprice,
                        Image: proDetails.Image
                    }
                }).then((response) => {
                    resolve(response)
                })
        })
    },
    getAllUsers: (prodId) => {
        return new Promise(async (resolve, reject) => {
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(users)
        })
    },
    blockUser: (userData) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userData) }, {
                $set: {
                    status: false
                }
            }).then((response) => {
                resolve(response)
            })
        })
    },
    unblockUser: (userData) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userData) }, {
                $set: {
                    status: true
                }
            }).then((response) => {
                resolve(response)
            })
        })
    },

    addCategory: (data) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).insertOne(data).then((response) => {
                resolve(response)
                console.log(response);
            })

        })

    },
    getCategory: () => {
        // console.log("category vanu");
        return new Promise(async (resolve, reject) => {
            let category = await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray()
            resolve(category);
        })
    },
    getCategoryDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).findOne({ _id: objectId(proId) }).then((product) => {
                resolve(product)
            })
        })
    },
    updateCategory: (proId, proDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION)
                .updateOne({ _id: objectId(proId) }, {

                    $set: {
                        Category: proDetails.Category,
                        Image: proDetails.Image
                    }
                }).then((response) => {
                    resolve(response)
                })
        })
    },
    deleteCategory: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({ _id: objectId(prodId) }).then((response) => {
                resolve(response)
            })
        })
    },
    getAllOrders: () => {
        return new Promise(async (resolve, reject) => {
            let orderList = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $project: {
                        date:1,
                        deliveryDetails: 1,
                        userId: 1,
                        paymentMethod: 1,
                        item: '$products.item',
                        quantity: '$products.quantity',
                        totalAmount: 1,
                        status: 1
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $lookup: {
                        from: collection.ADDRESS_COLLECTION,
                        localField: 'deliveryDetails',
                        foreignField: '_id',
                        as: 'address'
                    }
                },
                {
                    $project: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        userId: 1,
                        paymentMethod: 1,
                        item: {$arrayElemAt:['$product',0]},
                        address:{$arrayElemAt:['$address',0]},
                        totalAmount: 1,
                        status: 1
                    }
                }
                
            ]).sort({ date: -1 }).toArray()
            console.log("order list thaze ind");
            // orderList.deliveryDetails = await db.get().collection(collection.ADDRESS_COLLECTION).findOne({ _id: orderList.deliveryDetails })
            console.log(orderList)
            resolve(orderList)
        })
    },
    cancelOrder: (orderId) => {
        return new Promise((resolve, reject) => { 
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: {
                        status: 'cancelled'
                    }
                }).then((response) => {
                    resolve(response)
                })
        })
    },
    shipOrder: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: {
                        status: 'shipped'
                    }
                }).then((response) => {
                    resolve(response)
                })
        })
    },
    deleiverOrder: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: {
                        status: 'deleivered'
                    }
                }).then((response) => {
                    resolve(response)
                })
        })
    },
    getCod: () => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        paymentMethod: "COD",
                        status: "placed"
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: "$totalAmount"
                        }
                    }
                }
            ]).toArray()


            console.log("nnnnnnnnnnnnnnnnnnnnnnnnnnnnn");
            if (total[0]) {
                console.log(total[0].total);
                resolve(total[0].total)

            } else {
                resolve(0)
            }
        })
    },
    getRazorpay: () => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        paymentMethod: "razorpay",
                        status: "placed"
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: "$totalAmount"
                        }
                    }
                }
            ]).toArray()


            console.log("nnnnnnnnnnnnnnnnnnnnnnnnnnnnn");
            if (total[0]) {
                resolve(total[0].total)
            } else {
                resolve(0)
            }

        })
    },
    getPaypal: () => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        paymentMethod: "paypal",
                        status: "placed"
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: "$totalAmount"
                        }
                    }
                }
            ]).toArray()


            console.log("nnnnnnnnnnnnnnnnnnnnnnnnnnnnn");
            if (total[0]) {
                console.log(total[0].total);
                resolve(total[0].total)

            } else {
                resolve(0)
            }

        })
    },
    returnOrder: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) },
                {
                    $set: {
                        status: 'returned'
                    }
                }).then((response) => {
                    resolve(response)
                })
        })
    },
    addOffer: (offr, id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.OFFER_COLLECTION).insertOne(offr).then((data) => {
                console.log(data);

                resolve(data)
            })
        })
    },
    getOffer: () => {
        // console.log("category vanu");
        return new Promise(async (resolve, reject) => {
            let offer = await db.get().collection(collection.OFFER_COLLECTION).find().toArray()
            resolve(offer);
        })
    },
    getAllOffer: (offId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.OFFER_COLLECTION).findOne({ _id: objectId(offId) }).then((offer) => {
                resolve(offer)
            })
        })
    },
    updateOffer: (offId, offer) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.OFFER_COLLECTION).updateOne({ _id: objectId(offId) }, {
                $set: {
                    offername: offer.offername,
                    discount: offer.discount
                }
            }).then((response) => {

                resolve(response)
            })
        })
    },
    applyOffer: (offer) => {
        return new Promise(async (resolve, reject) => {
            let offdata = await db.get().collection(collection.OFFER_COLLECTION).find({ offername: offer.offername }).toArray()
            console.log(offdata);
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).find({ Name: offer.Name }).toArray()
            console.log(product);
            console.log("0000000000000000000000");

            let offerper = offdata[0].discount;
            let offprice = Math.round(product[0].Price * (offerper) / 100);
            let finalprice = Math.round(product[0].Price - offprice);

            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ Name: offer.Name }, {
                $set: {
                    offerpercent: offerper,
                    offerprice: offprice,
                    finalprice: finalprice,
                    offerstatus: true
                }
            }).then((result) => {
                console.log(result);
                resolve(result)
            })


        })
    },
    removeOffer: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(prodId) }, {
                $set: {
                    offerpercent: 0,
                    offerprice: 0,
                    finalprice: 0,
                    offerstatus: false
                }
            })
        })
    },
    getTotalSale: () => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        status: "placed"
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: "$totalAmount"
                        }
                    }
                }
            ]).toArray()


            console.log("nnnnnnnnnnnnnnnnnnnnnnnnnnnnn");
            if (total[0]) {
                console.log(total[0].total);
                resolve(total[0].total)

            } else {
                resolve(0)
            }
        })
    },
    addCoupon: (coupn) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).insertOne(coupn).then((data) => {
                resolve(data)
            })
        })
    },
    getCoupon: () => {
        return new Promise((resolve, reject) => {
            let coupon = db.get().collection(collection.COUPON_COLLECTION).find().toArray()
            resolve(coupon)
        })
    },
    getAllCoupon: (coupId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).findOne({ _id: objectId(coupId) }).then((coupon) => {
                resolve(coupon)
            })
        })
    },
    updateCoupon: (coupId, coupon) => {
        console.log(coupId);
        console.log("22222222222222222222222");
        console.log(coupon);
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).updateOne({ _id: objectId(coupId) }, {
                $set: {
                    couponname: coupon.couponname,
                    discountper: coupon.discountper
                }
            }).then((response) => {

                resolve(response)
            })
        })
    },
    salesReport: (from, to) => {
        return new Promise(async (resolve, reject) => {
            let report = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        date: { $gte: from, $lte: to }
                    },

                },
                {
                    $project: {
                        date: 1,
                        deliveryDetails: 1,
                        item: '$products.item',
                        quantity: '$products.quantity',
                        paymentMethod: 1,
                        totalAmount: 1,
                        status: 1

                    },
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $lookup: {
                        from: collection.ADDRESS_COLLECTION,
                        localField: 'deliveryDetails',
                        foreignField: '_id',
                        as: 'address'
                    } 
                },
                {
                    $project: {
                        date: {$dateToString :{ format:"%Y-%M-%d", date:"$date"}},
                        deliveryDetails: 1,
                        item: {$arrayElemAt:['$product',0]},
                        address:{$arrayElemAt:['$address',0]},
                        paymentMethod: 1,
                        totalAmount: 1,
                        status: 1

                    },
                }
            ]).toArray()

            console.log("ithentha vanoooo"); 
            console.log(report);
            resolve(report)
        })
    },
    disableCoupon: (coupId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).updateOne({ _id: objectId(coupId) }, {
                $set: {
                    status: false
                }
            })
        }).then((response) => {
            resolve(response)
        })
    },
    activateCoupon: (coupId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).updateOne({ _id: objectId(coupId) }, {
                $set: {
                    status: true
                }
            })
        }).then((response) => {
            resolve(response)
        })
    },
    coupHistory:(coupId)=>{
        return new Promise(async(resolve,reject)=>{
         let history= await  db.get().collection(collection.COUPON_COLLECTION).aggregate([
                
                {
                    $project:{
                        couponname:1,
                        discountper:1
                     }
                },
                {
                    $lookup: {
                        from: collection.USER_COLLECTION,
                        localField: 'couponname',
                        foreignField: 'coupon',
                        as: 'history'
                    }
                },
             
                {
                    $project:{
                        couponname:1,
                        discountper:1,
                        history:{$arrayElemAt:['$history',0]}
                     }
                },
                {
                    
                        $unwind:'$history.coupon'
                    
                }  
         ]).toArray()

        // db.get().collection(collection.USER_COLLECTION).find({coupon: {$in: coupId}}).toArray().then((response)=>{
        //  resolve(response)

        // })
         
         console.log(history);
         
         resolve(history)
              
        })
    },
    addBanner:(data)=>{
        return new Promise((resolve,reject)=>{
            let image={}
            image.name= data.filename
            console.log(image);
            db.get().collection(collection.BANNER_COLLECTION).insertOne(image).then(()=>{
                resolve()
            })
        })
    }
}