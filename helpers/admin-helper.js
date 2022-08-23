var db=require('../config/connection')
var collection=require('../config/collections')
const { ObjectId } = require('mongodb')
var objectId=require('mongodb').ObjectId
module.exports={
    doLogin:(adminData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus=false
            let response={}
            let admin=await db.get().collection(collection.ADMIN_COLLECTION).findOne({Email:adminData.Email})
            console.log(admin);
            if(admin) {
                if(adminData.Password==admin.Password)
                {
                    console.log("Login Success");
                    response.admin=admin
                    response.status=true
                    resolve(response)
                }
                else{
                    console.log("Login Failed");
                    resolve({status:false})
                }
            }
            else{
                console.log("Login Failed");
                resolve({status:false})
            }
        })
    }
    
}